import streamlit as st
import asyncio
from dotenv import load_dotenv
import uuid
from gaspr.persistent import FileSystem, File
from gaspr.indexer import VectorIndexer, ListIndexer, MultiIndexer, LlamaIndexResponse
from gaspr.llms import AzureOpenAI
from pathlib import Path

load_dotenv()
fs:FileSystem = None
rootpath = Path(__file__).parent.parent
indices: MultiIndexer = None

def send_prompt():
    if st.session_state.prompt:
        st.session_state.disabled = True
        prompt = st.session_state["prompt"]
        st.session_state["prompt"] = ""
        st.session_state.disabled = True
        asyncio.run(send_prompt_done(prompt))

async def send_prompt_done(query):
    global indices
    with st.spinner("test"):
        response = indices.index['lindex'].query(query)
        st.session_state.responses.append(response.text)
    st.session_state.disabled = False

async def upload_files(uploaded_files):
    global fs, indices

    files = await fs._aget_files()
    file_names = set([file.name for file in files])
    new_file_name = set([uploaded_file.name for uploaded_file in uploaded_files])

    add_files = new_file_name.difference(file_names)
    remove_files = file_names.difference(new_file_name)

    with st.spinner("uploading files"):
        for uploaded_file in uploaded_files:
            if uploaded_file.name in add_files:
                print(f'adding file {uploaded_file.name}...')
                bytes_data = uploaded_file.read()
                content = bytes_data.decode('utf-8')
                file = File(uploaded_file.name, content)
                await indices.ainsert_file(file)

        for remove_file in remove_files:
            print(f'removing file {remove_file}...')
            await indices.aremove_file(remove_file)


def getfolderpath() -> Path:
    global rootpath
    return rootpath.joinpath('examples', st.session_state.session)

def save_index():
    global indices
    asyncio.run(indices.asave_indices())

async def initialize():
    global fs, rootpath, indices
    fs = FileSystem(getfolderpath().resolve(), create_missing=True)
    vindexer = await VectorIndexer.create(llm=AzureOpenAI('text-davinci-003', embedding_model='text-embedding-ada-002'), storage=fs)
    lindexer = await ListIndexer.create(llm=AzureOpenAI('text-davinci-003', embedding_model='text-embedding-ada-002'), storage=fs)
    indices = MultiIndexer()
    await indices.add_index(vindexer, 'vindex')
    await indices.add_index(lindexer, 'lindex')

def main():
    global fs
    
    hide_streamlit_style = """
                <style>
                #MainMenu {visibility: hidden;}
                footer {visibility: hidden;}
                </style>
                """
    st.markdown(hide_streamlit_style, unsafe_allow_html=True) 

    st.session_state['prompt_disabled'] = False
    if "disabled" not in st.session_state:
        st.session_state.disabled = False
    if "responses" not in st.session_state:
        st.session_state.responses = []
    st.session_state.inprogress = False
    if "session" not in st.session_state:
        st.session_state.session = str(uuid.uuid4())

    st.title('Document Sentiment')
    st.subheader('SICY built generative ai document(s) searcher')
    st.caption(f"Session: {st.session_state.session}")

    asyncio.run(initialize())
    
    with st.container():
        files = st.file_uploader("Upload documents for search", accept_multiple_files=True)
        asyncio.run(upload_files(files))

    st.markdown('<hr />', True)
    if len(st.session_state.responses) > 0:
        st.caption('Responses')
    with st.container():
        for response in st.session_state.responses:
            st.write(response)
    st.markdown('<hr />', True)

    with st.form("form"):
        prompt = st.text_area('Prompt', placeholder='Prompt', disabled=st.session_state.disabled, key='prompt')
        submitted = st.form_submit_button("Submit", on_click=send_prompt)

    st.button("Save Index(s)", on_click=save_index)

main()
