from gaspr.indexer.base import BaseIndexer
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class FilesResponse():
    """"List of files for a session"""
    session_id:str
    files: list[str] = field(default_factory=list)

@dataclass
class FileResponse():
    """ File for a session """
    session_id:str
    file: str

@dataclass
class IndexInitializeResponse():
    """ Response object when initializing a index session """
    session: str
    history:dict = None

class IndexSession():
    index: BaseIndexer = None
    session_id: str = None
    search_type: str = None
    last_update: float = datetime.timestamp(datetime.utcnow())

@dataclass
class PromptResponse():
    prompt: str = None
    completion: str = None
