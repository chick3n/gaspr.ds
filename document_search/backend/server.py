from flask import Flask, jsonify, request
from gaspr import MultiIndexer, ListIndexer, VectorIndexer, AzureOpenAI, FileSystem
from gaspr.persistent.base import BasePersistentStorage
from gaspr.indexer.base import BaseIndexer
from models import IndexInitializeResponse, IndexSession, PromptResponse
import models
import logging
import asyncio
import json
from dotenv import load_dotenv
from pathlib import Path
from typing import Any

load_dotenv()

app = Flask(__name__)  
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('document_search')
sessions:dict[str, IndexSession] = {}
SESSION_HISTORY_FOLDER = 'history'
SESSION_HISTORY_FILENAME = 'session_history.json'
SESSION_HISTORY_TEMPLATE = {
    'files': [],
    'list_chat': [],
    'vector_chat': []
}

def get_folder_path(path: str) -> Path:
    """ Get the local folder where index data is stored """
    path = Path(__file__).resolve().parent.joinpath('data', path)
    return path

def get_storage(session_id:str, create_missing:bool = False) -> BasePersistentStorage:
    """ Get a storage instance """
    return FileSystem(get_folder_path(session_id), create_missing=create_missing)

@app.route('/files/<string:session_id>', methods=['GET'])
async def get_session_files(session_id:str) -> models.FilesResponse:
    files = []
    try:
        fs = get_storage(session_id)
        files = await fs._aget_files()
    except Exception as ex:
        #logger.critical(f'Failed to get files for {session_id}', exc_info=ex)
        pass
    response = models.FilesResponse(session_id, [file.name for file in files])
    return jsonify(response)

@app.route('/files/<session_id>', methods=['POST'])
async def insert_session_files(session_id) -> models.FilesResponse:
    """ insert files to indexer(s) """
    fs = get_storage(session_id, create_missing=True)

    response = models.FilesResponse(session_id=session_id)
    for _, file in request.files.items():
        logger.info(f'Adding {file.filename} to indexes')
        filename = file.filename
        content = file.read().decode('utf-8')
        await fs._aupload_file_content(filename, content, overwrite=True)
        response.files.append(filename)

    return jsonify(response), 201

@app.route('/file/<session_id>/<string:filename>', methods=['DELETE'])
async def delete_session_file(session_id, filename:str) -> models.FileResponse:
    """ delete file from session storage """
    fs = get_storage(session_id, create_missing=True)
    response = models.FileResponse(session_id=session_id, file=filename)
    await fs._adelete_file(filename)
    return jsonify(response), 201

@app.route('/save/<session_id>', methods=['POST'])
async def save_indices(session_id) -> None:
    """ save the indices to their storage """
    session = get_session(session_id)
    await session.indices.asave_indices()
    return "", 201

@app.route('/prompt/<session_id>/<search_type>', methods=['POST'])
def prompt_list(session_id:str, search_type:str) -> PromptResponse:
    """ Send prompt to list index """
    session = get_session(get_session_key(session_id, search_type))
    body = request.get_json(silent=True)
    response = session.index.query(body['prompt'])
    return jsonify(PromptResponse(prompt=body['prompt'], completion=response.text))

@app.route('/savechat/<session_id>/<search_type>', methods=['POST'])
async def save_chat_history(session_id:str, search_type:str):
    """ Save the history for the session """
    body = request.get_json()
    chat = body['chat'] or []    
    history = await get_session_history(session_id)
    history[f'{search_type}_chat'] = chat
    await save_session_history(session_id, history)
    return "", 200

def get_session(key:str) -> IndexSession:
    """ Get a session index """
    if key in sessions:
        return sessions[key]
    raise ValueError(f'{key} not found.')

async def get_session_history(session_id:str) -> dict:
    fs = get_storage(session_id, create_missing=True)
    session_history_file = await fs._aget_file(SESSION_HISTORY_FILENAME, SESSION_HISTORY_FOLDER)
    if session_history_file:
        try:
            return json.loads(session_history_file.content)
        except: pass
    return SESSION_HISTORY_TEMPLATE.copy()

async def save_session_history(session_id:str, history:dict) -> None:
    fs = get_storage(session_id, create_missing=True)
    await fs._aupload_file_content(SESSION_HISTORY_FILENAME, json.dumps(history), SESSION_HISTORY_FOLDER, overwrite=True)

async def create_list_indexer(session_id: str, **kwargs:Any) -> ListIndexer:
    logger.info(f'Creating list index {session_id} using model text-davinci-003 and embedding text-embedding-ada-002')
    return await ListIndexer.create(llm=AzureOpenAI('text-davinci-003', embedding_model='text-embedding-ada-002'), 
                                    storage=get_storage(session_id, create_missing=True))

async def create_vector_indexer(session_id:str, **kwargs:Any) -> VectorIndexer:
    logger.info(f'Creating vector index {session_id} using model text-davinci-003 and embedding text-embedding-ada-002')
    indexer = await VectorIndexer.create(llm=AzureOpenAI('text-davinci-003', embedding_model='text-embedding-ada-002'), 
                                        storage=get_storage(session_id, create_missing=True), use_saved_index=True)
    await indexer.asave()
    return indexer

async def create_indexer(search_type:str, session_id:str, **kwargs:Any) -> BaseIndexer:
    """create indexer"""
    if search_type == 'list':
        return await create_list_indexer(session_id, **kwargs)
    elif search_type == 'vector':
        return await create_vector_indexer(session_id, **kwargs)
    raise ValueError(f'{search_type} indexer not yet implemented')

async def create_session(session_id:str, search_type:str) -> IndexSession:
    """ Create a new index session """
    key = get_session_key(session_id, search_type)
    try:
        session = get_session(key)
        return session
    except: pass

    session = IndexSession()
    session.index = await create_indexer(search_type=search_type, session_id=session_id)
    session.session_id = session_id
    session.search_type = search_type

    sessions[key] = session
    return session

def get_session_key(session_id:str, search_type:str) -> str:
    return f'{session_id}_{search_type}'


@app.route('/initialize/<session_id>/<search_type>', methods=['GET'])
async def initialize_index(session_id:str, search_type:str) -> IndexInitializeResponse:
    """ Initialize a new index session or get a index session """
    await create_session(session_id, search_type)

    response = IndexInitializeResponse(session_id)
    history = await get_session_history(session_id)
    response.history = history if history else SESSION_HISTORY_TEMPLATE    
    return jsonify(response)

      
# Running app
if __name__ == '__main__':
    app.run(debug=True)