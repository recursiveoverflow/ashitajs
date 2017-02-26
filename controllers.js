var crypto=require('crypto');
  /**
  * Console Controller
  */
exports.consoleCtl = {
    printMessage:function printMessage( usr, msg ) {
      //var timestamp = moment().format("HH:mm:ss");
      console.log("<" + usr + ">: " + msg );
    },
    printSystem:function printSystem( str )	{
      console.log("@System: " + str);
    },
    printError:function printError( str ) {
      console.log("!!! Error !!!: " + str);
    }
  };
  /**
  * Session Controller
  */
exports.sessionCtl = {
    init:function init() {
      this.activeSessions = new Object();
    },
    generateId:function generateId() {
      return crypto.randomBytes(8).toString('hex');
    },
    getValue:function getValue( sessionid, field ) {
      if (  this.activeSessions[sessionid] ) {
        return this.activeSessions[sessionid][field];
      }
      return false;
    },
    setValue:function setValue( sessionid, field, value) {
      if ( this.activeSessions[sessionid] ) {
        this.activeSessions[sessionid][field] = value;
        return true;
      }
      return false;
    },
    getObject:function getObject( sessionid ) {
      if ( this.activeSessions[sessionid] ) {
        return this.activeSessions[sessionid];
      }
      return false;
    },
    setObject:function setObject( sessionData )	{
      if ( !this.activeSessions[sessionData.sessionid] ) {
        this.activeSessions[sessionData.sessionid] = {
          "username":sessionData.username,
          "ipaddr":sessionData.ipaddr,
          "channels":sessionData.channels,
          "authenticated":sessionData.authenticated
        };
        return true;
      }
      return false;
    },
    destroyObject:function( sessionid )	{
      if ( this.activeSessions[sessionid] ) {
        delete this.activeSessions[sessionid];
        return true;
      }
      return false;
    }
  };
  /**
  * Channel Controller
  */
exports.channelCtl = {
    init:function init() {
      this.activeChannels = new Object();
      this.activeChannels["System"] = {
        "userlist":['System'],
        "owner":"System",
        "groups":['System']
      };
    },
    getValue:function getValue( channel, field ) {
      if ( this.activeChannels[channel] ) {
        return this.activeChannels[channel][field];
      }
      return false;
    },
    setValue:function setValue( channel, field, value ) {
      if ( this.activeChannels[chanenl] ) {
        this.activeChannels[channel][field] = value;
        return true;
      }
      return false;
    },
    getObject:function getObject( channel )	{
      if ( this.activeChannels[channel] ) {
        return this.activeChannels[channel];
      }
      return false;
    },
    setObject:function setObject( channelData )	{
      if ( !this.activeChannels[channelData.name] ) {
        this.activeChannels[channelData.name] = {
          "userlist":channelData.userlist,
          "owner":channelData.owner,
          "groups":channelData.groups,
          "messages":channelData.messages
        };
        return true;
      }
      return false;
    },
    destroyObject:function destroyObject( channelData )	{
      if ( this.activeChannels[channelData.name] ) {
        delete this.activeChannels[channelData.name];
        return true;
      }
      return false;
    },
    join:function join( channelData ) {
      if ( this.activeChannels[channelData.name]['userlist'].indexOf( channelData.username ) !== -1 ) {
        return true;
      }
      return false;
    },
    exit:function exit( channelData ) {
      if ( this.activeChannels[channelData]['userlist'].indexOf( channelData.username ) === -1 ) {
        return true;
      }
      return false;
    },
    message:function message( channelData )	{
      if ( this.activeChannels[channelData.name] ) {
        this.activeChannels[channelData.name]['messages'].push( channelData );
        return true;
      }
      return false;
    }
  };
  /**
  * Peer Controller
  */
exports.peerCtl = {
    init:function init() {
      this.activePeers = new Object();
    },
    getPeers:function getPeers() {
      return this.activePeers;
    },
    addPeer:function addPeer( peerIp, username ) {
      this.activePeers[peerIp] = username;
    },
    checkPeer:function checkPeer( peerIp ) {
      if ( this.activePeers[peerIp] ) {
        return true;
      }
      return false;
    },
    removePeer:function addPeer( peerIp ) {
      delete this.activePeers[peerIp];
    }
  };