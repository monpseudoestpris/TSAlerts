interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function ScreenAlert({ visible, title, message, onClose }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1300] bg-black/55 flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center space-y-4 animate-halo">
        <div className="text-5xl" aria-hidden="true">🔔</div>
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <p className="text-inkSoft">{message}</p>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          J'ai vu
        </button>
      </div>
    </div>
  );
}
