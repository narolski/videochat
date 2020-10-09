import Peer from "peerjs";
import { useState, useEffect, useMemo, useCallback } from "react";

const STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
  "stun:stun3.l.google.com:19302",
  "stun:stun4.l.google.com:19302",
];

type HookReturn = {
  error?: Record<string, unknown>;
  id: string;
  loading: boolean;
  connectTo: (id: string) => Promise<Peer.MediaConnection>;
};

function getStream() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}

function attachStreamToVideo(stream: MediaStream) {
  const video = document.createElement("video");
  video.src = "urlToVideo.ogg";
  video.autoplay = true;
  video.style.border = "1px solid black";
  document.body.appendChild(video);

  try {
    video.srcObject = stream;
  } catch (error) {
    video.src = window.URL.createObjectURL(stream);
  }
}

export default function useWebRTC(): HookReturn {
  const [state, setState] = useState<
    Pick<HookReturn, "id" | "loading" | "error">
  >({
    id: null,
    loading: true,
  });

  const { id, loading, error } = state;

  const peer = useMemo(
    () =>
      new Peer({
        config: {
          iceServers: [{ urls: STUN_URLS }],
        },
      }),
    []
  );

  const connectTo = useCallback(
    (destId: string) =>
      getStream().then((stream) => {
        const call = peer.call(destId, stream);
        call.on("stream", (remoteStream) => {
          attachStreamToVideo(remoteStream);
        });
        return call;
      }),
    []
  );

  useEffect(() => {
    peer.on("open", (newId) => {
      setState({ ...state, id: newId, loading: false });
      console.log("open", newId);
    });

    peer.on("error", (err) => {
      setState({ ...state, loading: false, error: err.message });
      console.error(err);
    });

    peer.on("call", async (call: Peer.MediaConnection) => {
      console.log("call", call);
      const stream = await getStream();

      call.answer(stream);

      call.on("stream", (remoteStream) => {
        attachStreamToVideo(remoteStream);
        console.log("onStream", remoteStream);
      });
    });

    return () => {
      peer.destroy();
    };
  }, []);

  return { id, loading, error, connectTo };
}
