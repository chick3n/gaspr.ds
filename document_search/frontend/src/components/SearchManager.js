import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from 'uuid'

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import PolylineIcon from '@mui/icons-material/Polyline';
import ChatIcon from '@mui/icons-material/Chat';
import SubjectIcon from '@mui/icons-material/Subject';
import Container from '@mui/material/Container';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';

const searchTypes = {
    list: {
        id: 'list',
        name: 'Full Text',
        desc: 'Search against all the documents uploaded.',
        icon: <SubjectIcon fontSize="medium" />
    },
    vector: {
        id: 'vector',
        name: 'Vector',
        desc: 'Finds similar data using approximate nearing neighbor algorithms.',
        icon: <PolylineIcon fontSize="medium" />
    },
    chat: {
        id: 'chat',
        name: 'Chat',
        desc: 'Converse with a bot against your documents.',
        icon: <ChatIcon fontSize="medium" />
    }
}

function SearchUI(props) {
    const [waiting, setWaiting] = useState(false);
    const [completions, setCompletions] = useState([]);
    const [initialize, setInitializing] = useState(false)
    const completionsEndRef = useRef(null);
    const prevSearchType = useRef("");

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
        fetch("/prompt/" + props.session + "/" + props.searchType.id, opt).then((res) =>
            res.json().then((data) => {
                console.log('completion', data)
                setCompletions(prevCompletions => [...prevCompletions, { complete: data.completion, prompt: data.prompt }]);
                setWaiting(false);
            })
        );
    }

    const CompletionProgress = () => {
        return waiting ? <LinearProgress /> : ''
    }

    const CompleteTypography = () => {
        return (<Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                {completions.map((item, index) => {
                    return (
                        <>
                        <Typography className="response-prompt" sx={{ whiteSpace: 'pre-line' }} align="left" variant="body2" key={uuidv4()}>
                            <Stack direction="row" gap={2}>
                            <PermIdentityIcon fontSize="medium" />
                            {item.prompt.trim()}
                            </Stack>
                        </Typography>
                        <Typography className="response-complete" sx={{ whiteSpace: 'pre-line' }} align="left" variant="body2" key={uuidv4()}>
                            <Stack direction="row" gap={2}>
                                <img src="./logo-white.png" height="24" />
                            {/* <DeviceHubIcon fontSize="medium" /> */}
                            {item.complete.trim()}
                            </Stack>
                        </Typography>
                        </>
                    )
                })}
                <div ref={completionsEndRef} />
            </Box>

        )
    }

    const SaveChat = (searchType) => {
        const chats = completions
        const data = {chat: chats}
        console.log(JSON.stringify(data))
        fetch('/savechat/' + props.session + '/' + searchType, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    }

    useEffect(() => {
        //Initialize new 
        setInitializing(true);
        if(completions.length > 0 && prevSearchType.current) {
            SaveChat(prevSearchType.current)
        }

        if(props.session === null || props.searchType.id === null) {
            setInitializing(false);
            return;
        }
        
        setCompletions([]);
        fetch('/initialize/' + props.session + '/' + props.searchType.id).then(res => {
            res.json().then(data => {
                console.log('SearchUI', 'useEffect[searchType]', data)
                let key = props.searchType.id + '_chat';
                if(data['history'] && data['history'][key]) {
                    console.log('SearchUI', 'useEffect[searchType]', 'setCompletions', data['history'][key])
                    setCompletions(data['history'][key])
                }
                setInitializing(false);
            })
        })
        prevSearchType.current = props.searchType.id;
    }, [props.searchType])

    useEffect(() => {
        console.log('SearchUI', 'useEffect[files]', props.files)
    }, [props.files])

    if(props.searchType === null || (props.searchType !== null && props.searchType.id === null)) return;

    const PromptUI = () => {
        if(initialize) return (<div style={{textAlign:'center'}}><CircularProgress color="secondary" /></div>);
        return (
            <>
            <Container className='file-upload-container chat-completion-container' sx={{ border: '1px solid #1976d217', borderRadius: '4px', maxWidth:'100%', minHeight: '160px' }}>
            <CompleteTypography />
            <CompletionProgress color="secondary" />
            <TextField
                fullWidth 
                className="prompt-text-field"
                id="outlined-multiline-static"
                placeholder="Send a message..."
                multiline
                rows={2}
                defaultValue=""
                disabled={waiting}
                onKeyDown={onPromptKeyDown}
                />
            </Container>
            <Typography className="subtext" variant="caption" display="block" gutterBottom sx={{ padding:'4px 12px' }}>Ctrl + Enter to submit prompt.</Typography>
            </>
        )
    }
    

    return (
        <div className="searchPromptUi">
            <hr class="ui-flow-heading-spacer" />
            <div class="ui-flow-heading">
                <h1 className="ui-flow-heading">Prompt</h1>
                <p class="ui-flow-heading">Begin the conversation against your corpus of text.</p>
            </div>
            <PromptUI />
        </div>
    );
}

function SearchManager(props) {
    const [activeSearch, setActiveSearch] = useState({id: null})
    
    const isActive = (type) => {
        return type === activeSearch.id;
    }

    const buttonVariant = (type) => {
        if(isActive(type))
            return 'contained';
        return 'outlined';
    }

    const ButtonBar = () => {
        if (props.files) {
            return (
                <Box sx={{ '& button': { m: 1 } }}>
                    <hr class="ui-flow-heading-spacer" />
                    <div className="search-bar-ui">
                        <div class="ui-flow-heading">
                            <h1 className="ui-flow-heading">Method</h1>
                            <p class="ui-flow-heading">Select the search that best covers the information you are looking to gather from your corpus of text.</p>
                        </div>
                        <div class="search-bar-content">
                        {['list', 'vector', 'chat'].map(key => {
                            const searchType = searchTypes[key];
                            return (
                                <Button className="button" key={key} variant={buttonVariant(searchType.id)} size='large'
                                    onClick={() => setActiveSearch(searchType)}
                                    disabled={isActive(searchType.id)}>
                                        <Stack spacing={1}>
                                            <Stack alignItems="center" gap={1} direction="row">
                                            {searchType.icon}
                                            <div class="method-button-title">{searchType.name}</div>
                                            </Stack>
                                            <p class="method-button-desc">{searchType.desc}</p>
                                        </Stack> 
                                </Button>
                            )
                        })}
                        </div>
                    </div>
                </Box>
            )
        }
    };

    return (
        <div>
            <ButtonBar />
            <SearchUI session={props.session} files={props.files} searchType={activeSearch} />
        </div>
    )
}

export default SearchManager