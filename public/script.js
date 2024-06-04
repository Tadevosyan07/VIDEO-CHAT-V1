document.addEventListener('DOMContentLoaded', () => {
  const socket = io('/');
  const videoGrid = document.getElementById('video-grid');
  const myPeer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '3031'
  });
  const myVideo = document.createElement('video');
  myVideo.muted = true;
  const peers = {};
  let myStream;

  // Get user media (video and audio)
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', userId => {
      connectToNewUser(userId, myStream);
    });
  });

  socket.on('user-disconnected', userId => {
    if (peers[userId]) {
      peers[userId].close();
      delete peers[userId];
    }
  });

  myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id, ''); 
  });

  function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
      video.remove();
    }); 

    peers[userId] = call;
  }

  function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
    videoGrid.append(video);
  }

  // Mute/Unmute
  const muteButton = document.getElementById('muteButton');
  muteButton.addEventListener('click', () => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myStream.getAudioTracks()[0].enabled = false;
      setUnmuteButton();
    } else {
      myStream.getAudioTracks()[0].enabled = true;
      setMuteButton();
    }
  });

  function setMuteButton() {
    const html = `
      <i class="fa fa-microphone"></i>
    `;
    document.querySelector('#muteButton').innerHTML = html;
  }

  function setUnmuteButton() {
    const html = `
      <i class="unmute fa fa-microphone-slash"></i>
    `;
    document.querySelector('#muteButton').innerHTML = html;
  }

  // Play/Stop Video
  const stopVideo = document.getElementById('stopVideo');
  stopVideo.addEventListener('click', () => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    if (enabled) {
      myStream.getVideoTracks()[0].enabled = false;
      setPlayVideo();
    } else {
      myStream.getVideoTracks()[0].enabled = true;
      setStopVideo();
    }
  });

  function setStopVideo() {
    const html = `
      <i class="fa fa-video-camera"></i>
    `;
    document.querySelector('#stopVideo').innerHTML = html;
  }

  function setPlayVideo() {
    const html = `
      <i class="stop fa fa-video-slash"></i>
    `;
    document.querySelector('#stopVideo').innerHTML = html;
  }

  // Show/Hide Chat
  const showChat = document.getElementById('showChat');
  const mainRight = document.querySelector('.main__right');
  showChat.addEventListener('click', () => {
    if (mainRight.classList.contains('active')) {
      mainRight.classList.remove('active');
    } else {
      mainRight.classList.add('active');
    }
  });

  // Send Message
  const chatInput = document.getElementById('chat_message');
  const sendButton = document.getElementById('send');
  const messagesContainer = document.querySelector('.messages');

  sendButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (chatInput.value!== '') {
      socket.emit('message', chatInput.value);
      chatInput.value = '';
    }
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value!== '') {
      socket.emit('message', chatInput.value);
      chatInput.value = '';
    }
  });

  socket.on('createMessage', (message, userName) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `<b><i class="far fa-user-circle"></i> <span> ${userName === '' ? 'Anonymous' : userName}</span> </b><span>${message}</span>`;
    messagesContainer.append(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Screen Sharing
  const screenShareButton = document.getElementById('screenShareButton');
  let screenStream = null;
  screenShareButton.addEventListener('click', async () => {
    if (!screenStream) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      myPeer.call(ROOM_ID, screenStream);
      socket.emit('screen-share', { streamId: screenStream.id, roomId: ROOM_ID });
    } else {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
      socket.emit('screen-share', { streamId: null, roomId: ROOM_ID });
    }
  });

  socket.on('user-screen-sharing', (streamId) => {
    const screenVideo = document.createElement('video');
    screenVideo.srcObject = new MediaStream([myPeer.getRemoteStreams().find(stream => stream.id === streamId).getVideoTracks()[0]]);
    addVideoStream(screenVideo, screenVideo.srcObject);
  });

  // Pointer Control
  const pointerControlButton = document.getElementById('pointerControlButton');
  pointerControlButton.addEventListener('click', () => {
    document.body.addEventListener('mousemove', handlePointerMove);
  });

  function handlePointerMove(event) {
    socket.emit('pointer-control', {
      roomId: ROOM_ID,
      x: event.clientX,
      y: event.clientY
    });
  }

  socket.on('pointer-control', (pointerData) => {
    // Handle pointer control display on the screen
    const pointerElement = document.getElementById('pointer-control');
    if (!pointerElement) {
      const newPointerElement = document.createElement('div');
      newPointerElement.id = 'pointer-control';
      newPointerElement.style.position = 'absolute';
      newPointerElement.style.background = 'red';
      newPointerElement.style.width = '10px';
      newPointerElement.style.height = '10px';
      document.body.append(newPointerElement);
    }
    document.getElementById('pointer-control').style.left = `${pointerData.x}px`;
    document.getElementById('pointer-control').style.top = `${pointerData.y}px`;
  });

  // End Call
  const endCallButton = document.getElementById('endCallButton');
  endCallButton.addEventListener('click', () => {
    socket.emit('end-call');
    window.location.href = '/';
  });

  const inviteButton = document.getElementById('inviteButton');
  inviteButton.addEventListener('click', () => {
    prompt(
      "Copy this link and send it to people you want to invite",
      window.location.href
    ); 
  });
});
