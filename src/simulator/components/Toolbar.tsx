interface Props {
  recording: boolean;
  onRotate: () => void;
  onScreenshot: () => void;
  onToggleRecord: () => void;
}

export function Toolbar({ recording, onRotate, onScreenshot, onToggleRecord }: Props) {
  return (
    <div className="toolbar" style={{ display: 'flex', gap: 6 }}>
      <button onClick={onRotate} title="Rotate">⟲ Rotate</button>
      <button onClick={onScreenshot} title="Screenshot">📷</button>
      <button onClick={onToggleRecord} title="Record" style={{ color: recording ? '#f87171' : undefined }}>
        {recording ? '■ Stop' : '● Rec'}
      </button>
    </div>
  );
}
