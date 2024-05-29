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
    connectToNewUser(userId, stream);
  });
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id, ''); // User name can be passed here if needed
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
const input = document.getElementById('chat_message');
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value !== '') {
    socket.emit('message', input.value);
    input.value = '';
  }
});

document.getElementById('send').addEventListener('click', () => {
  if (input.value !== '') {
    socket.emit('message', input.value);
    input.value = '';
  }
});

socket.on('createMessage', (message, userName) => {
  const messages = document.querySelector('.messages');
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `<b><i class="far fa-user-circle"></i> <span> ${userName === '' ? 'Anonymous' : userName}</span> </b><br/>${message}`;
  messages.append(messageElement);
  messages.scrollTop = messages.scrollHeight;
});

// Invite members
const inviteButton = document.getElementById('inviteButton');
inviteButton.addEventListener('click', () => {
  prompt(
    "Copy this link and send it to people you want to invite",
    window.location.href
  );
});

// Screen Share
const screenShareButton = document.getElementById('screenShareButton');
screenShareButton.addEventListener('click', () => {
  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true
    }
  }).then(screenStream => {
    addVideoStream(myVideo, screenStream);

    screenStream.getVideoTracks()[0].onended = () => {
      addVideoStream(myVideo, myStream);
    };

    socket.emit('screen-share', { streamId: myPeer.id, roomId: ROOM_ID });

    screenStream.getTracks().forEach(track => {
      myStream.addTrack(track);
    });
  }).catch(error => {
    console.error('Error sharing screen:', error);
  });
});

// Pointer Control
const pointerControlButton = document.getElementById('pointerControlButton');
pointerControlButton.addEventListener('click', () => {
  document.addEventListener('mousemove', (event) => {
    const pointerData = {
      roomId: ROOM_ID,
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight
    };
    socket.emit('pointer-control', pointerData);
  });
});

socket.on('pointer-control', (data) => {
  const pointerElement = document.getElementById('pointer');
  if (!pointerElement) {
    const newPointer = document.createElement('div');
    newPointer.id = 'pointer';
    newPointer.style.position = 'absolute';
    newPointer.style.width = '20px';
    newPointer.style.height = '20px';
    newPointer.style.background = 'red';
    newPointer.style.borderRadius = '50%';
    document.body.appendChild(newPointer);
  }

  const pointer = document.getElementById('pointer');
  pointer.style.left = data.x * window.innerWidth + 'px';
  pointer.style.top = data.y * window.innerHeight + 'px';
});
