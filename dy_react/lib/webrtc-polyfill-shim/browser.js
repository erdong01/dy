// Browser environment - use native WebRTC APIs
// These are globally available in modern browsers

const RTCPeerConnection = globalThis.RTCPeerConnection || globalThis.webkitRTCPeerConnection || globalThis.mozRTCPeerConnection;
const RTCSessionDescription = globalThis.RTCSessionDescription;
const RTCIceCandidate = globalThis.RTCIceCandidate;

module.exports = {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
};

// Also export as named exports for ES module compatibility
module.exports.RTCPeerConnection = RTCPeerConnection;
module.exports.RTCSessionDescription = RTCSessionDescription;
module.exports.RTCIceCandidate = RTCIceCandidate;
