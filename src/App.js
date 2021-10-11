import * as SignalR from '@microsoft/signalr';
import Peer from 'peerjs';
import './App.css';
import styled from 'styled-components'
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';



const StyledVideo = styled.video`
  height: 200px;
  width: 300px
`

const Video = ({stream}) => {
    const ref = useRef();

    console.log("YEET");
    useEffect(( ) => {
      ref.current.srcObject = stream;
    }, [])
    

    return (
        <StyledVideo muted playsInline autoPlay ref={ref}/>
    );
}

function App() {

  const hub = useRef();
  const myPeer = useRef();
  const [videos, setVideos] = useState([]);
  const ROOMID = "Tjuvholmen";
  const myVideoStream = useRef();
  const peers = {};
  const myID = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(async (stream) => {
      hub.current = new SignalR.HubConnectionBuilder()
        .withUrl("http://192.168.1.113:5000/signalr")
        .configureLogging(SignalR.LogLevel.Information)
        .build();
      await hub.current.start();

      myID.current = uuidv4();

      myPeer.current = new Peer(myID.current, {
        path: "/",
        host: "192.168.1.113",
        port: 5000
      })


      myVideoStream.current.srcObject = stream

      myPeer.current.on('call', call => {
        console.log("Called");
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
          console.log("Got stream");
          addVideoStream(userVideoStream);
        });
      });

      hub.current.on('UserConnected', userId => {
        if(userId == myID.current) return;
        connectToNewUser(userId, stream);
      })
      hub.current.on("UserDisconnected", userId => {
        if (peers[userId]) peers[userId].close();
      })

      myPeer.current.on('open', id => {
        hub.current.invoke("JoinRoom", ROOMID, id);
      });



    });


  }, [])

  function addVideoStream(stream) {
    setVideos(vids => [...vids, stream])
  }

  function connectToNewUser(userId, stream) {
    const call = myPeer.current.call(userId, stream);
    const video = document.createElement('video');
    const vid = React.createElement('video');
    const streamID = stream.id;

    call.on('stream', userVideoStream => {
      console.log("Got stream");
      addVideoStream(userVideoStream);
    }); 
    call.on('close', () => {
      let vids = videos;
      vids = videos.filter(vid => vid!=streamID);
      setVideos(vids);
    });

    peers[userId] = call;
  }


  function removeDupes() {

    const usedID = [];

    const vids = videos.map((stream, index) => {
      if(usedID.indexOf(stream.id) > -1) {
        return
      }
      usedID.push(stream.id);
      return <Video stream={stream} key={index}/>

    });

    return vids;

  }



  return (
    <div className="App">

      {
        removeDupes()
      }

      <UserVid muted autoPlay ref={myVideoStream}/>
    </div>
  );
}

const UserVid = styled.video`
  position: absolute;
  width: 200px;
  height: 200px;
  bottom: 0;
  right:0;
`

export default App;
