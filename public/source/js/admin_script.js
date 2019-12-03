
// When the DOM is ready
document.addEventListener("DOMContentLoaded", function(event) {
    var peer_id;
    var username;
    var conn;
    var connected_peers_name_dict = {};
    var current_peer_username;
    const constraints =  {
        autoGainControl: false,
        noiseSuppression: true,
        echoCancellation: true,
    };

    function updateTable(object) {
        var tbody = document.getElementById('tbody');
        console.log('in updateTable...', object, ' ');
        tbody.innerHTML = '';
        for (const [key, value] of Object.entries(object)) {
            console.log(key, value);
            var tr = "<tr id='" + key + "'>";
            tr += "<td>" + value + "</td>" + "<td> " + key + "</td></tr>";
            tbody.innerHTML += tr;
          }
    }
    const http = new XMLHttpRequest()
    var url = "a";

    http.open("GET", "https://localhost:8443/serverIP")
    http.send()
    http.onload = function () {
                // Do something with the retrieved data ( found in xmlhttp.response )
                url = http.responseText;
                console.log('url: ', url, ' ', url);
                document.getElementById('qrcodetext').textContent = 'Fond of typing? Go to url: ' + url;
                var qrcode = new QRCode(document.getElementById("qrcode"), {
                text: url,
                width: 512,
                height: 512,
            });
      }
      
    /**
     * Important: the host needs to be changed according to your requirements.
     * e.g if you want to access the Peer server from another device, the
     * host would be the IP of your host namely 192.xxx.xxx.xx instead
     * of localhost.
     *
     * The iceServers on this example are public and can be used for your project.
     */
    const peer = new Peer('mw002', {
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
        document.getElementById("peer_id").value += peer_id;
        document.getElementById("connected_peer").innerHTML = "Peer, Session ID:" + connection.metadata.username + ", " + peer_id;
        current_peer_username = connection.metadata.username;
        connected_peers_name_dict[peer_id] = connection.metadata.username;
        console.log('Connection metadata:', connection.metadata);
        console.log('Connected peers: ', connected_peers_name_dict);
        document.getElementById('ip-list').innerHTML += '<li>' + connection.metadata.username + ' ' +   peer_id + '</li>';
        updateTable(connected_peers_name_dict);
        window.setInterval(function() {
            connection.peerConnection.getStats(null).then(stats => {
                console.log('in setInterval...')
              let statsOutput = "";
          
              stats.forEach(report => {
                statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
                               `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
                
                // Now the statistics for this report; we intentially drop the ones we
                // sorted to the top above
                Object.keys(report).forEach(statName => {
                  if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
                    statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
                  }
                });
              });
          
              document.getElementById("stats-box").innerHTML = statsOutput;
            });
          }, 10000); 
    });

    peer.on('close', function(mediaConnection){
        console.log('in on close');
        if(mediaConnection != null) {
            console.log('in on close, username:', mediaConnection.metadata.username);
            console.log('in on close, username:', mediaConnection.metadata);
        }
    });

    peer.on('error', function(err){
       // alert("An error ocurred with peer: " + err);
        console.error("Reason of error " + err);
        var connectionStatusElement = document.getElementById("errorStatus");
        connectionStatusElement.textContent = 'The session has finished with error: ' + err;
        console.log('connected peers: ', connected_peers_name_dict);
        if((call.peer in connected_peers_name_dict)) {
            delete connected_peers_name_dict[call.peer];
            console.log('peer deleted...');
        }
        updateTable(connected_peers_name_dict);
    });

    /**
     * Handle the on receive call event
     */
    peer.on('call', function (call) {
      //  console.log('in onCall ', call.metadata);
        console.log("Current user name: ", current_peer_username, ' call: ', call);
        
       // var acceptsCall = confirm(`Audiocall incoming from ${current_peer_username}  do you want to accept it ?`);
        var confirms = document.getElementById('confirmsCall');
        confirms.style.display = 'block';
        var acceptsCallMessageElement = document.getElementById('confirmsCallMessage');
        acceptsCallMessageElement.textContent = "Incoming call from '" + current_peer_username + "', do you want to allow him to speak?"
        var confirmsCallYesElement = document.getElementById("confirmsCallYes");
        var confirmsCallNoElement = document.getElementById("confirmsCallNo");
        var acceptsCall = false;
        console.log('aceptsCall..', acceptsCall);
        confirmsCallYesElement.addEventListener("click",  function(){
            console.log('in confirm yess');
            acceptsCall = true;
            var nameAndSessionId = '';
            
            if(call.peer in connected_peers_name_dict) {
                document.getElementById("connected_peer").innerHTML = "Peer, Session ID:" + connected_peers_name_dict[call.peer] + ", " + call.peer;
                nameAndSessionId = connected_peers_name_dict[call.peer] + ", Session Id: " + call.peer;
            }
            document.getElementById('peer_id').textContent = nameAndSessionId;
             // Answer the call with no audio stream
             call.answer();

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
                 var connectionStatusElement = document.getElementById("connectionStatus");
                 connectionStatusElement.textContent = 'The session has finished with ' + call.peer;
                 console.log('connected peers: ', connected_peers_name_dict);
                    if((call.peer in connected_peers_name_dict)) {
                        delete connected_peers_name_dict[call.peer];
                        console.log('peer deleted...');
                    }
                    updateTable(connected_peers_name_dict);
                //  alert("The session has finished");
             });
             confirms.style.display = 'none';
             // use call.close() to finish a call
            
        }, false); 

        confirmsCallNoElement.addEventListener("click",  function(){
            console.log('Call declined...');
            confirms.style.display = 'none';
        }, false); 

        console.log('aceptsCall second time..', acceptsCall);
    });

    peer.on('disconnected', function(call) {
        console.log('in disconnected..');
        console.log('connected peers: ', connected_peers_name_dict);
        if((call.peer in connected_peers_name_dict)) {
            delete connected_peers_name_dict[call.peer];
            console.log('peer deleted...');
        }
        updateTable(connected_peers_name_dict);
    }, false);

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
        audio.srcObject = stream;
        // Store a global reference of the stream
        window.peer_stream = stream;  
    }

    /**
     * Appends the received and sent message to the listview
     *
     * @param {Object} data
     */
    function handleMessage(data) {
        console.log('in handle message.');
        var orientation = "text-left";

        // If the message is yours, set text to right !
        if(data.from == username){
            orientation = "text-right"
        }
        var messageHTML =  '<a href="javascript:void(0);" class="list-group-item' + orientation + '">';
                messageHTML += '<h4 class="list-group-item-heading">'+ data.from +'</h4>';
                messageHTML += '<p class="list-group-item-text">'+ data.text +'</p>';
            messageHTML += '</a>';
        console.log(messageHTML);
        console.log('data', data, ' peer: ');
       // document.getElementById("messages").innerHTML += messageHTML;

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
     * Handle the mute button
     */
    document.getElementById('mute-peer').addEventListener('change',  function muteUnmute(){
        console.log('in muteUnmute');
        var checkBox = document.getElementById("mute-peer");
        if (checkBox.checked == true){
            window.peer_stream.getAudioTracks()[0].enabled = false;
            checkBox.textContent = "Unmute Participant";
        } else {
            window.peer_stream.getAudioTracks()[0].enabled = true;
            checkBox.textContent = "Mute Participant";
        }
    },false);

    /**
     *  Request muting the microphone at admin side.
     */
    document.getElementById("cancel").addEventListener("click", function(){
        console.log('Muting microphone at admin side.');
        window.peer_stream.getAudioTracks()[0].stop();
    }, false);
}, false);
