import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid'
import FileManager from "./components/FileManager"
import Footer from './components/Footer'
import HeaderNavBar from './components/HeaderNavBar'
import "./App.css";
  
var initialized = false;

function App() {
    const [session, setSession] = useState(null);

    // on page render
    useEffect(() => {
        if(!initialized) {
            let existing_session = Object.fromEntries(new URLSearchParams(window.location.search)).session;
            if (!existing_session) {
                existing_session = uuidv4()
                window.history.replaceState({}, '', '?session=' + existing_session);
                console.log('update url');
            }   
            console.log('App', 'useEffect', existing_session);                   
            setSession(existing_session);  
        }
        initialized = true;
    }, []);
  
    return (
        <div className="App">
            <HeaderNavBar />
            <div className="App-header">                
                <h1 className="app-title">GASPR.d</h1>
                <p className="app-subtitle">Search documents using generative AI.</p>
                <a className="app-get-started" href="#corpus">
                    Get Started
                </a>
            </div>
            <div className="content">
                <FileManager session={session} />
            </div>
            <Footer session={session} />
        </div>
    );
}
  
export default App;