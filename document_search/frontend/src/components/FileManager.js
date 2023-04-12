import { MuiFileInput } from 'mui-file-input';
import React, { useState, useEffect } from "react";
import SearchManager from './SearchManager'

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from '@mui/material/IconButton';
import ArticleIcon from "@mui/icons-material/Article";
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';

function FileManager(props) {
    const [files, setFiles] = React.useState([]);
    const [fileUploadValue, setFileUploadValue] = useState(null);
    const [waiting, setWaiting] = useState(false);

    const fileUploadOnChange = (newFiles) => {
        console.log(newFiles)
        setFileUploadValue(newFiles);
        postFiles(newFiles);
    }    
    const clearFileInput = () => setFileUploadValue(null);
  
    const getFiles = () => {
        fetch("/files/" + props.session).then((res) =>
            res.json().then((data) => {
                console.log(props.session, data);
                setFiles(data.files);
                setWaiting(false);
            })
        );
    }
    const postFiles = (upload_files) => {
        const data = new FormData();
        for(let x=0; x<upload_files.length; x++) {
            data.append('file' + x, upload_files[x]);
        }

        fetch("/files/" + props.session, {
            method: 'POST',
            body: data
        }).then((res) =>
            res.json().then((data) => {
                if(data && data.files) {
                    setFiles(o => [...o, ...data.files])                
                    console.log('postFiles', props.session, data)
                }
                clearFileInput();
            })
        );
    }
    const deleteFile = (filename) => {
        console.log('preDeleteFile', props.session, files);
        fetch("/file/" + props.session + "/" + encodeURIComponent(filename), {
            method: 'DELETE'
        }).then((res) => res.json().then((data) => {
            if(data && data.file) {
                setFiles(o => o.filter(file => file !== data.file));
                console.log('deleteFile', props.session, data);
            }
        }));
    }

    useEffect(() => {
        console.log('FileManager', 'useEffect', props.session);
        if(props.session) {
            setWaiting(true);
            getFiles();
        }
    }, [props.session]);

    const FileList = () => <List dense={true} sx={{ width: '100%' }} >
                {files.map((file) => (
                <ListItem key={file} 
                    secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => deleteFile(file)}>
                            <DeleteIcon htmlColor='#fff' />
                        </IconButton>
                    }>
                    <ListItemIcon>
                        <ArticleIcon htmlColor='#fff' />
                    </ListItemIcon>
                    <ListItemText className='file-upload-file-text' primary={file} />
                </ListItem>
                ))}
            </List>

    let containerBorder = (files.length === 0 ? 'none' : '1px solid #1976d217')

    return (
        <>
            <div class="ui-flow-heading" id='corpus'>
                <h1 class="ui-flow-heading">Corpus</h1>
                <p class="ui-flow-heading">Start by uploading files to create a collection of texts that will be used to search against.</p>
            </div>
            <div class="file-upload-content">
                <Container className='file-upload-container' sx={{ border: containerBorder, borderRadius: '4px', maxWidth:'100%', minHeight: '160px', maxHeight: '400px', overflowY: 'auto' }}>
                    <MuiFileInput 
                        className="file-input"
                        placeholder={files.length > 0 ? "Add files" : "Upload files to get started."}
                        value={fileUploadValue} 
                        sx={{ width: '100%', marginTop: 2 }}
                        multiple 
                        onChange={fileUploadOnChange} />
                    {(!waiting) ? <FileList /> : <CircularProgress color="secondary" /> }
                </Container>
            </div>
            <SearchManager session={props.session} files={files} />
        </>
    )
}

export default FileManager