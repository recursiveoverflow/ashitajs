const peerManager       = require("./middleware/peerManager");
const cli               = require("./lib/ui");
let mdns;
let bonjour;
let v1 = true;

//if ( process.platform === 'darwin' ) v1 = true;

if ( v1 ) {
  mdns = require('mdns');
  mdns.createAdvertisement(mdns.tcp('ashitajs'), peerManager.getPeerPort, {networkInterface: peerManager.getInterface}).start();
} else {
  bonjour = require('bonjour')();
  let broadcast = bonjour.publish({ name: `hostname-${require('shortid').generate()}`, type: 'ashitajs', port: peerManager.getPeerPort });
  broadcast.on('up', function(){
    cli.Panel.debug("Broadcasting: ", peerManager.getPeerPort);
  });  
}

function parseService ( service ) {
      let peerIp = null;
      if ( v1 ) {
          peerIp = (function getIPv4 ( ind ){
            if ( service.addresses[ind].includes(':') ) return getIPv4( ind + 1 );
            return service.addresses[ind]; 
          })( 0 );
      } else {
          peerIp = service.referer.address;
      }
      //cli.Panel.debug(service);
      if ( !peerIp ) return false; // no ipv4 discovered in the broadcast
      if ( peerManager.getActivePeers.includes(`${peerIp}:${service.port}`) ) return false; // if we already know this peer
      if ( peerIp === '127.0.0.1' && service.port === peerManager.getPeerPort ) return false; // connecting to ourselves lol
      // if it matches ourself, we shouldn't connect, lol
      if ( peerIp === peerManager.getPeerIp && service.port === peerManager.getPeerPort ) {
        return false;
      } else {
        // in this case we are connecting, debug information logged
        cli.Panel.debug('Discovered peer: ' + peerIp + ':' + service.port);
        peerManager.connectToPeer( peerIp, service.port );
      }
}

function discoverPeers( repeat ) {
    // watch all http servers
    let browser;
    try {
      
      if ( v1 ) {
        browser = mdns.createBrowser(mdns.tcp('ashitajs'));
        browser.on('serviceUp', function(service) {
          parseService( service );
        });
      } else {
        browser = bonjour.find({ type: 'ashitajs' }, (service) => {
          parseService( service );
        });
      }
    
    // 

    } catch ( e ) {}
    setTimeout(function(){
      cli.screens["Log"].setLabel("Log"); // hack-o!
    }, 3000);
    browser.start();
    return repeat(); // repeat-o!
}

(function repeat(){
  setTimeout(function(){
    cli.screens["Log"].setLabel("Searching for Peers..."); // hack-o!
    discoverPeers( repeat ); // discover peers infinitely with a recursive function derp x.x
  }, 10000);
})();
