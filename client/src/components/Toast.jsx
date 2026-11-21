import { AlertIcon, CheckIcon, CloseIcon } from "./icons";

function Toast({ notice, onClose }) {
  if (!notice) return null;
  const isError = notice.type === "error";

  return (
    <div
      className={`toast toast-${notice.type}`}
      role={isError ? "alert" : "status"}
    >
      {isError ? <AlertIcon /> : <CheckIcon />}
      <span>{notice.text}</span>
      <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}

export default Toast;
