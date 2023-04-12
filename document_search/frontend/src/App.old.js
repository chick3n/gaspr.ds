import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from 'uuid'
import { MuiFileInput } from 'mui-file-input';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import LinkIcon from '@mui/icons-material/Link';
import ArticleIcon from "@mui/icons-material/Article";
import Typography from "@mui/material/Typography";
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import "./App.css";
  
var initialized = false;

function App() {
    const [session, setSession] = useState(uuidv4());
    const [value, setValue] = useState(null);
    const [files, setFiles] = React.useState([]);
    const [waiting, setWaiting] = useState(false);
    const [completions, setCompletions] = useState([]);
    const completionsEndRef = useRef(null);
    
    const handleChange = (newValue) => {
        console.log(newValue)
        setValue(newValue)
        setTimeout(clearFileInput, 3000);
      }
    const clearFileInput = () => setValue(null);
    const onPromptKeyDown = (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            console.log('sending prompt...');
            setWaiting(true);
            sendPrompt(event.target.value);
            event.target.value = '';
        }
    }
    const sendPrompt = (prompt) => {
        let opt = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt
            })
        }
        fetch("/prompt/" + session + "/list", opt).then((res) =>
            res.json().then((data) => {
                console.log('completion', data)
                setCompletions(prevCompletions => [...prevCompletions, { complete: data.completion, prompt: data.prompt }]);
                setWaiting(false);
            })
        );
    }

    const scrollToBottom = () => {
        completionsEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    
      useEffect(() => {
        scrollToBottom()
      }, [completions]);

    function FileList() {
        if (files.length === 0) return;

        return (
            <>
                <Typography sx={{ mt: 4, mb: 2 }} variant="h6" component="div">
                    Corpus
                </Typography>
                <List dense={true}>
                    {files.map((file) => (
                    <ListItem key={file}>
                        <ListItemIcon>
                        <ArticleIcon color="white" />
                        </ListItemIcon>
                        <ListItemText primary={file} />
                    </ListItem>
                    ))}
                </List>
            </>
        );
      }

    function Prompter() {
        if(files.length === 0) return;
        return (
            <>
            <TextField
                fullWidth 
                id="outlined-multiline-static"
                label="Prompt"
                multiline
                rows={4}
                defaultValue=""
                disabled={waiting}
                onKeyDown={onPromptKeyDown}
                />
            <Typography variant="caption" display="block" gutterBottom>Ctrl + Enter to submit prompt.</Typography>
            </>
        )
    }

    function CompletionProgress() {
        return waiting ? <LinearProgress /> : ''
    }

    function CompleteTypography() {
        return (<Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {completions.map(item => {
                return (<Typography sx={{ whiteSpace: 'pre-line' }} align="left" variant="body2" gutterBottom key={uuidv4()}>
                    {item.complete}
                </Typography>)
            })}
            <div ref={completionsEndRef} />
            </Box>
        )
    }
  
    // Using useEffect for single rendering
    useEffect(() => {
        if(!initialized) {
            const existing_session = Object.fromEntries(new URLSearchParams(window.location.search)).session;
            if (existing_session) {
                setSession(existing_session);
                console.log('fetching', '/initialize/' + existing_session)
                fetch("/initialize/" + existing_session).then((res) =>
                    res.json().then((data) => {
                        console.log(existing_session, data)
                        setFiles(data.files)
                    })
                );
            } else {
                window.history.replaceState({}, '', '?session=' + existing_session);
                console.log('update url');
            }
        }
        initialized = true;
    }, []);
  
    return (
        <div className="App">
            <header className="App-header">
                <h1>Document Sentiment</h1>
                <h4>SICY generative ai document(s) searcher</h4>
                <Typography variant="caption" display="block" gutterBottom>Session: {session} <LinkIcon fontSize="small" /></Typography>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <MuiFileInput 
                            className="file-input"
                            placeholder={files.length > 0 ? "Add files" : "Upload files"}
                            value={value} 
                            multiple 
                            onChange={handleChange} />
                        <FileList />
                    </Grid>
                    <Grid item xs={6}>
                        <CompleteTypography />
                        
                    </Grid>
                    <Grid item xs={6}>                        
                    </Grid>
                    <Grid item xs={6}>
                        <CompletionProgress />                    
                        <Prompter />
                    </Grid>
                </Grid>
                    
            </header>
        </div>
    );
}
  
export default App;