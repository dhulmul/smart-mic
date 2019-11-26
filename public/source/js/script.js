// When the DOM is ready
    document.addEventListener("DOMContentLoaded", function(event) {
    var peer_id;
    var username;
    var conn;
    var is_peer_connected = true;

    const constraints =  {
        autoGainControl: false,
        noiseSuppression: true,
        echoCancellation: true,
        sampleRate: 32000,
        volume: 0.0,
    };
    var progressBar = new ldBar('#progressBar');
    progressBar.set(1);

    function updateProgressBar(percentage) {
        progressBar.set(percentage);
    }

    DetectRTC.load(function() {
        console.log('detect rtc', DetectRTC);
        var basicChecks = ["isWebRTCSupported", "hasMicrophone", "isWebsiteHasMicrophonePermissions", "getDownlink"];
        var basicChecksHintText = ["Is WebRTC supported:", "Device has a microphone:", 
        "App already has Microphone Access:", "Network Bandwidth (Mbit/sec):"];
        var results = [];
        var percentageChecksDone = 0;
        var checksCompleted = 0;
       
        for (element of basicChecks) {
            console.log(element);
            document.getElementById(element).className = element;
            var fn = window[element];
            if (typeof fn === "function") {
                checksCompleted += 1;
                percentageChecksDone = (checksCompleted / basicChecks.length) * 100;
                console.log('Percentage Checks Done: ', percentageChecksDone);
                results.push(fn.apply(null));
                console.log(element + ' value: ');
                updateProgressBar(percentageChecksDone);
            }
        }
        if(percentageChecksDone >= 100) {
            document.getElementById('basicChecks').textContent = "Results:";
            var progressBar = document.getElementById('progressBar');
            progressBar.parentNode.removeChild(progressBar);

            var count = 0;
            for (element of basicChecks) {
                console.log(element);
                var msg = results[count];
                if (msg == true)
                    msg = 'Yes'
                document.getElementById(element).textContent = basicChecksHintText[count] + " " + msg;
                count += 1;
            }
        }
    });    

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
      //  document.getElementById("peer-id-label").innerHTML = peer.id;
    });

    // When someone connects to your session:
    //
    // 1. Hide the peer_id field of the connection form and set automatically its value
    // as the peer of the user that requested the connection.
    peer.on('connection', function (connection) {
        conn = connection;
        peer_id = connection.peer;

        // Use the handleMessage to callback when a message comes in
        conn.on('data', handleMessage);

        // Hide peer_id field and set the incoming peer id as value
        document.getElementById("peer_id").className += " hidden";
        document.getElementById("peer_id").value = peer_id;
        document.getElementById("connected_peer").innerHTML = connection.metadata.username;
        console.log('Connection metadata:', connection.metadata);
    });

    peer.on('error', function(err){
        alert("Your session has expired, reloading...");
        console.error("Reason of error " + err);
        window.location.reload(true);
    });


    peer.on('disconnected', function(err){
        console.error("RePeer disconnected" + err);
        is_peer_connected = false;
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

        if(element_id === 'my-camera') {
            console.log('streaming from localhost..');
            const audioTrack = stream.getAudioTracks()[0]
            var ctx = new AudioContext()
            var src = ctx.createMediaStreamSource(new MediaStream([audioTrack]))
            var dst = ctx.createMediaStreamDestination()
            var gainNode = ctx.createGain()
            gainNode.gain.value = 0.9;

            // var delay = ctx.createDelay(179);
            // delay.delayTime.value = 179;
            // Attach src -> gain -> dst
            [src, gainNode, dst].reduce((a, b) => a && a.connect(b))
            stream.removeTrack(audioTrack)
            stream.addTrack(dst.stream.getAudioTracks()[0])
        } else {
            console.log('not my-camera element');
        }
      
        
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

    /**
     *  Request a audiocall to the other user
     */

    var onLongPress = function(event) {
        console.log('in on ontouchstartevent: ' + peer_id);
        console.log(peer);
        window.localStream.getAudioTracks()[0].enabled = true;
        window.peer_stream.getAudioTracks()[0].enabled = true;
        var call = peer.call(peer_id, window.localStream);
        console.log('connections:############ onlongpress', peer.connections);
        call.on('stream', function (stream) {
            window.peer_stream = stream;
            onReceiveStream(stream, 'peer-camera');
        });
        call.on('close', function (stream) {
            console.log('in on close of peer..');
            peer.disconnect();
        });
    };

    var onKeyUp = function(event) {
        console.log('in onKeyUp: ' + peer_id);
        console.log(peer);
        console.log('connections:############ onkeyup', peer.connections);
        window.localStream.getAudioTracks()[0].enabled = false;
        window.peer_stream.getAudioTracks()[0].enabled = false;
    };

    var onHangup = function(event) {
        console.log('in onHangup: ' + peer_id);
        console.log(peer);
        console.log('connections:############ onHangup', peer.connections);
        window.localStream.getAudioTracks()[0].stop();
        window.peer_stream.getAudioTracks()[0].stop();
        window.location.reload(true);
    };

    document.getElementById("call").addEventListener("touchstart", onLongPress, false);
    document.getElementById("call").addEventListener("touchend", onKeyUp, false);
    document.getElementById("call").addEventListener("mousedown", onLongPress, false);
    document.getElementById("call").addEventListener("mouseup", onKeyUp, false);
    document.getElementById("hangup").addEventListener("click", onHangup, false);
    
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

    /**
     * Initialize application by requesting your own audio to test !
     */
    requestLocalAudio({
        success: function(stream){
            console.log('type of stream: ', typeof(stream));
            const track = stream.getAudioTracks()[0];
            // track.applyConstraints(constraints);
            // console.log('Type of track: ', typeof(track));
            console.log(track.getConstraints());
            window.localStream = stream;
            onReceiveStream(stream, 'my-camera');
        },
        error: function(err){
            alert("Cannot get access to your microphone !");
            console.error(err);
        }
    });
}, false);
