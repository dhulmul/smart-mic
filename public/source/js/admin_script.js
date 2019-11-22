
// When the DOM is ready
document.addEventListener("DOMContentLoaded", function(event) {
    var peer_id;
    var username;
    var conn;
    var connected_peers_name_list = [];
    var current_peer_username;
    const constraints =  {
        autoGainControl: false,
        noiseSuppression: true,
        echoCancellation: true,
    };

    var imageAddr = "http://www.tranquilmusic.ca/images/cats/Cat2.JPG" + "?n=" + Math.random();
    var startTime, endTime;
    var downloadSize = 5616998;
    var download = new Image();
    download.onload = function () {
        endTime = (new Date()).getTime();
        showResults();
    }
    startTime = (new Date()).getTime();
    download.src = imageAddr;

    function showResults() {
        var duration = (endTime - startTime) / 1000; //Math.round()
        var bitsLoaded = downloadSize * 8;
        var speedBps = (bitsLoaded / duration).toFixed(2);
        var speedKbps = (speedBps / 1024).toFixed(2);
        var speedMbps = (speedKbps / 1024).toFixed(2);
        alert("Your connection speed is: \n" + 
            speedBps + " bps\n"   + 
            speedKbps + " kbps\n" + 
            speedMbps + " Mbps\n" );
    }

      
    /**
     * Important: the host needs to be changed according to your requirements.
     * e.g if you want to access the Peer server from another device, the
     * host would be the IP of your host namely 192.xxx.xxx.xx instead
     * of localhost.
     *
     * The iceServers on this example are public and can be used for your project.
     */
    const peer = new Peer({
        // host: "192.168.0.105",
        // port: 9000,
        // path: '/peerjs',
        // debug: 5,
        // config: {
        //     'iceServers': [
        //         { url: 'stun:stun1.l.google.com:19302' },
        //         {
        //             url: 'turn:numb.viagenie.ca',
        //             credential: 'muazkh',
        //             username: 'webrtc@live.com'
        //         }
        //     ]
        // }
    });
    
    
    // Once the initialization succeeds:
    // Show the ID that allows other user to connect to your session.
    peer.on('open', function () {
        document.getElementById("peer-id-label").innerHTML = peer.id;
    });

    // When someone connects to your session:
    //
    // 1. Hide the peer_id field of the connection form and set automatically its value
    // as the peer of the user that requested the connection.
    // 2.
    peer.on('connection', function (connection) {
        conn = connection;
        peer_id = connection.peer;
        // Use the handleMessage to callback when a message comes in
        conn.on('data', handleMessage);
        // Hide peer_id field and set the incoming peer id as value
        // document.getElementById("peer_id").className += " hidden";
        document.getElementById("peer_id").value += peer_id;
        document.getElementById("connected_peer").innerHTML = "Name of peer:" + connection.metadata.username;
        current_peer_username = connection.metadata.username;
        connected_peers_name_list.push(connection.metadata.username);
        console.log('Connection metadata:', connection.metadata);
        console.log('Connected peers: ', connected_peers_name_list);
        document.getElementById('ip-list').innerHTML += '<li>' + connection.metadata.username + '</li>';
    });

    peer.on('close', function(mediaConnection){
        console.log('in on close, username:', mediaConnection.metadata.username);
    });

    peer.on('error', function(err){
        alert("An error ocurred with peer: " + err);
        console.error("Reason of error " + err);
    });

    /**
     * Handle the on receive call event
     */
    peer.on('call', function (call) {
      //  console.log('in onCall ', call.metadata);
        console.log("Current user name: ", current_peer_username);
        var acceptsCall = confirm(`Audiocall incoming from ${current_peer_username}  do you want to accept it ?`);

        if(acceptsCall){
            // Answer the call with your own audio stream
            call.answer(window.localStream);

            // Receive data
            call.on('stream', function (stream) {
                console.log('Constraints ************' ,stream.getAudioTracks()[0].getConstraints());
                // Store a global reference of the other user stream
                window.peer_stream = stream;
                // Display the stream of the other user in the peer-camera audio element !
                onReceiveStream(stream, 'peer-camera');
            });

            // Handle when the call finishes
            call.on('close', function(){
                console.log("Connection closed with: ", call.peer);
                alert("The session has finished");
            });

            // use call.close() to finish a call
        }else{
            console.log("Call denied !");
        }
    });

    /**
     * Starts the request of microphone
     *
     * @param {Object} callbacks
     */
    function requestLocalAudio(callbacks) {
        // Monkeypatch for crossbrowser geusermedia
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // Request audio
        navigator.getUserMedia({ audio: constraints} , callbacks.success , callbacks.error);
    }

    /**
     * Handle the providen stream (audio) to the desired audio element
     *
     * @param {*} stream
     * @param {*} element_id
     */
    function onReceiveStream(stream, element_id) {
        console.log('on onreceivestream: ', element_id); 
        // Retrieve the audio element according to the desired
        var audio = document.getElementById(element_id);
        // Set the given stream as the audio source
        //video.src = window.URL.createObjectURL(stream);
        audio.srcObject = stream;
        // Store a global reference of the stream
        window.peer_stream = stream;

        // var microphone = context.createMediaStreamSource(stream);
        // var filter = context.createBiquadFilter();
        // var peer_destination = context.createMediaStreamDestination();
        // microphone.connect(filter);
        // filter.connect(peer_destination);        
    }

    /**
     * Appends the received and sent message to the listview
     *
     * @param {Object} data
     */
    function handleMessage(data) {
        var orientation = "text-left";

        // If the message is yours, set text to right !
        if(data.from == username){
            orientation = "text-right"
        }

        var messageHTML =  '<a href="javascript:void(0);" class="list-group-item' + orientation + '">';
                messageHTML += '<h4 class="list-group-item-heading">'+ data.from +'</h4>';
                messageHTML += '<p class="list-group-item-text">'+ data.text +'</p>';
            messageHTML += '</a>';

        document.getElementById("messages").innerHTML += messageHTML;
    }

    /**
     * Handle the send message button
     */
    document.getElementById("send-message").addEventListener("click", function(){
        // Get the text to send
        var text = document.getElementById("message").value;

        // Prepare the data to send
        var data = {
            from: username,
            text: text
        };

        // Send the message with Peer
        conn.send(data);

        // Handle the message on the UI
        handleMessage(data);

        document.getElementById("message").value = "";
    }, false);

    // /**
    //  *  Request a audiocall to the other user
    //  */
    // document.getElementById("call").addEventListener("onmousedown", function(){
    //     console.log('Calling to ' + peer_id);
    //     console.log(peer);

    //     var call = peer.call(peer_id, window.localStream);
        
    //     console.log('connections:############ ', peer.connections);
    //     call.on('stream', function (stream) {
    //         window.peer_stream = stream;
    //         onReceiveStream(stream, 'peer-camera');
    //     });
    // }, false);

    //      /**
    //  *  Request a audiocall to the other user
    //  */
    // document.getElementById("call").addEventListener("onmouseup", function(){
    //     console.log('On Mouse Up, stop stream...');
    //     window.peer_stream.getAudioTracks()[0].stop();
    // }, false);

    /**
     *  Request muting the microphone at admin side.
     */
    document.getElementById("cancel").addEventListener("click", function(){
        console.log('Muting microphone at admin side.');
        window.peer_stream.getAudioTracks()[0].stop();
    }, false);

    /**
     * On click the connect button, initialize connection with peer
     */
    document.getElementById("connect-to-peer-btn").addEventListener("click", function(){
        username = document.getElementById("name").value;
        peer_id = document.getElementById("peer_id").value;

        if (peer_id) {
            conn = peer.connect(peer_id, {
                metadata: {
                    'username': username
                }
            });

            conn.on('data', handleMessage);
        }else{
            alert("You need to provide a peer to connect with !");
            return false;
        }
        document.getElementById("chat").className = "";
        document.getElementById("connection-form").className += " hidden";
    }, false);
}, false);
