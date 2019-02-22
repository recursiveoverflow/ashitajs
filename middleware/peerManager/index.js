"use strict";
const crypto    = require("crypto");
const client    = require("../../lib/client");
const cli       = require("../../lib/ui");
const test      = require("../../lib/manifest");
let username    = "Anonymous";
let publicKey   = undefined;
let privateKey  = undefined;
let nodeHost    = undefined;
let nodePort    = undefined;
let Interface   = undefined;
let activePeers       = [];


// Hmm, okay.

let leaderId    = undefined; // who am i following || null
let manifest = new Map(); // my direct peers (not distributed)

/**
 *  getManifest from other nodes
 *  ie: query peers, ask for manifest
 *  recieve manifest from first available or all peers?
 *  
 *  adding to manifest propogates thru all peers?
 *
 * how do we verify integrity of the manifest? well we have the public keys of our peers so a connection already verifies identity
 * however, how will we know its who they say they are? verify identity via keybase?
 * 
 * onboarding:
 * client sends packet to node
 * node checks if client can join
 * client can join
 * verify client
 * connection successful
 * add client to local manifest
 * send manifest to client
 * propogate new manifest to network
 *
 * we should track our peers, and the global manifest separately!!
 * damn so much coding to do, not to mention all the error handling im missing because im dumb :(
 */

class peerManager {

  static get getActivePeers () {
    return activePeers;
  }

  static setUsername( user ) {
    username = user;
  }

  static get getUsername () {
    return username;
  }

  static setInterface( iface ) {
    Interface = iface;
  }

  static get getInterface () {
    return Interface;
  }

  static setNodeHost ( host ) {
    nodeHost = host;
  }

  static get getNodeHost () {
    return nodeHost;
  }

  static setNodePort ( port ) {
    nodePort = port;
  }

  static get getNodePort () {
    return nodePort;
  }

  static get getNodeId () {
    return this.generatePeerId( publicKey );
  }

  static connectToPeer( host, port ) {
    if ( host === this.getNodeHost && port == this.getNodePort ) return false;
    if ( activePeers.includes(`${host}:${port}`) ) return false;
    new client( host, port, peerManager );
  }

  static setPublicKey ( key ) {
    publicKey = key;
  }

  static get getPublicKey () {
    return publicKey;
  }

  static setPrivateKey ( key ) {
    privateKey = key;
  }

  static get getPrivateKey () {
    return privateKey;
  }

  static get getLeader() {
    return leaderId;
  }

  static setLeader ( id ) {
    leaderId = id;
  }

  static addPeer ( clientInstance ) {
    if ( !activePeers.includes( `${clientInstance.nodeIp}:${clientInstance.nodePort}` ) ) {
      activePeers.push( `${clientInstance.nodeIp}:${clientInstance.nodePort}` );
      if ( this.getPeer ( clientInstance.nodeId ) ||
          clientInstance.nodeId === this.getNodeId ) {
        return false;
      }

      test.addEntry( clientInstance.nodeId, clientInstance.publicKey );
      manifest.set( clientInstance.nodeId, clientInstance );
    }

    return false;
  }

  static removePeer ( peerId ) {
    if ( this.getPeer( peerId ) ) {
      manifest.delete( peerId );
    }
  }

  static sendPeerEvent ( event, object ) {
    let message = {
      "type"      : event,
      "content"   : object
    };

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId && peer !== object.nodeId ) {
        message = JSON.stringify( message );
        peerSocket.write( message );
      }
    });
  }

  static sendEndEvent() {
    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId ) {
        let payload   = {
          "type"    : "disconnecting",
          "content" : {
            "peerId"   : this.getNodeId
          }
        };

        payload = JSON.stringify( payload );
        peerSocket.write(payload);
      }
    });
  }

  static sendNewPeerMessage ( peerId ) {
    let peers = [this.getNodeId];
    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId && peer !== peerId ) {
        peers.push( peer );
      }
    });

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId && peer !== peerId ) {
        let payload = {
          "type"      : "peerJoined",
          "content"   : {
            "peers"   : peers,
            "peerId"   : peerId
          }
        };

        payload = JSON.stringify( payload );
        peerSocket.write( payload );
      }
    });
  }

  static relayNewPeerMessage( peerId, peerArray ) {
    let peers = peerArray.slice();

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId && !peers.includes( peer ) ) {
        peers.push( peer );
      }
    });

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId ) {
        if ( !peerArray.includes( peer ) ) {
          let payload = {
            "type"      : "peerJoined",
            "content"   : {
              "peers"   : peers,
              "peerId"  : peerId
            }
          };

          payload = JSON.stringify( payload );
          peerSocket.write( payload );
        }
      }
    });    
  }

  static sendPrivateMessage( peerId, username, message ) {
    const crypto  = require('crypto');
    let encrypted = crypto.publicEncrypt( this.getPeerKey( peerId ), Buffer.from( message, 'utf-8') );
    let payload   = {
      "type"    : "privateMessage",
      "content" : {
        "peerId"   : this.getNodeId,
        "username" : username,
        "message"  : encrypted
      }
    };

    payload = JSON.stringify( payload );
    manifest.get( peerId ).write( payload );   
  }

  static sendPublicMessage( username, message ) {
    const crypto = require('crypto');

    let peers = [this.getNodeId];
    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId ) {
        peers.push( peer );
      }
    });

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId ) {
        let encrypted = crypto.privateEncrypt( privateKey, Buffer.from( message, 'utf-8') );
        let payload = {
          "type"      : "publicMessage",
          "content"   : {
            "peerId"   : peers,
            "username" : username,
            "message"  : encrypted
          }
        };

        payload = JSON.stringify( payload );
        peerSocket.write( payload );
      }
    });

  }

  static relayPublicMessage( peerId, username, message ) {
    const crypto = require('crypto');
    let peers = peerId.slice();

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId && !peers.includes( peer ) ) {
        peers.push( peer );
      }
    });

    manifest.forEach( ( peerSocket, peer ) => {
      if ( peer !== this.getNodeId ) {
        if ( !peerId.includes(peer) ) {
          let encrypted = crypto.publicEncrypt( this.getPeerKey( peer ), Buffer.from( message, 'utf-8') );
          let payload = {
            "type"      : "publicMessage",
            "content"   : {
              "peerId"   : peers,
              "username" : username,
              "message"  : encrypted
            }
          };

          payload = JSON.stringify( payload );
          peerSocket.write( payload );
        }
      }
    });
  }

  static whoHasAnswer ( peerId, requestorIds, route ) {
    manifest.get(requestorIds[requestorIds.length - 1]).write(JSON.stringify({
      "type": "whoHasAnswer",
      "content": {
        "peerId" : peerId,              // who was found
        "requestorIds" : requestorIds,  // chain to reverse
        "route": route                  // route to peer
      }
    }));
  }

  static whoHas( peerId ) {
    if ( peerManager.getPeer ( peerId ) ) return true;
    let requestorIds = [peerManager.getNodeId];
    manifest.forEach( ( peerSocket, peer ) => {
        if ( peer !== this.getNodeId ) {
          if ( !requestorIds.includes(peer) ) {
            let payload = {
              "type"      : "whoHas",
              "content"   : {
                "requestorIds"  : requestorIds, // who is asking
                "peerId"        : peerId      // to be located
              }
            };

            payload = JSON.stringify( payload );
            peerSocket.write( payload );
          }
        }
      });

    return false;
  }

  static whoHasRelay( requestorIds, peerId ) {
    if ( peerManager.getPeer ( peerId ) ) return true;

    manifest.forEach( ( peerSocket, peer ) => {
        if ( peer !== this.getNodeId ) {
          if ( !requestorIds.includes(peer) ) {
            let payload = {
              "type"      : "whoHas",
              "content"   : {
                "requestorIds"  : requestorIds, // who has requested
                "peerId"        : peerId        // to be located
              }
            };

            payload = JSON.stringify( payload );
            peerSocket.write( payload );
          }
        }
      });

    return false;
  }  

  static generatePeerId ( key ) {
    return crypto.createHmac("sha256", key).digest("hex");
  }

  static addKeyToChain ( peerId, publicKey ) {
    manifest.get( peerId ).publicKey = publicKey;
  }

  static getPeerKey ( peerId ) {
    return manifest.get( peerId ).publicKey;
  }

  static getManifest( ) {
    return manifest;
  }

  static getManifestEntry( id ) {
    return manifest.get( id );
  }

  static getPeers () {
    return Array.from( manifest.keys() );
  }

  static getPeer ( peerId ) {
    if ( manifest.has( peerId ) ) {
      return true;
    }
    return false;
  }
}

module.exports = peerManager;