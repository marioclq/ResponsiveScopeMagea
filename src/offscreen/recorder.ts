let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stream: MediaStream | null = null;

chrome.runtime.onMessage.addListener((msg: { type: string; streamId?: string }) => {
  if (msg.type === 'offscreen-start' && msg.streamId) void start(msg.streamId);
  if (msg.type === 'offscreen-stop') stop();
});

async function start(streamId: string) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-expect-error chrome-specific constraints
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId },
      },
    });
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const dataUrl = await blobToDataUrl(blob);
      void chrome.runtime.sendMessage({ type: 'recorder-data', dataUrl });
      stream?.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
  } catch (e) {
    void chrome.runtime.sendMessage({ type: 'recorder-error', message: String(e) });
  }
}

function stop() {
  recorder?.stop();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}
