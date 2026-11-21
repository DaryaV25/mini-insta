import { useState, useEffect } from "react";
import { FILTER_OPTIONS, getFilter } from "../utils/filters";
import { CloseIcon, ImageIcon } from "./icons";
import { ALBUMS } from "../utils/albums";

const EMPTY_FORM = { title: "", imageUrl: "", filter: "none", album: "" };

// Окно добавления (photo = null) и редактирования фото
function PhotoModal({ photo, albums, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    photo
      ? {
          title: photo.title,
          imageUrl: photo.imageUrl,
          filter: photo.filter,
          album: photo.album,
        }
      : EMPTY_FORM,
  );
  const [errors, setErrors] = useState({});
  const [previewFailed, setPreviewFailed] = useState(false);

  // Закрытие по Esc и блокировка прокрутки страницы под окном
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const setField = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === "imageUrl") setPreviewFailed(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      filter: form.filter,
      album: form.album.trim(),
    };

    const next = {};
    if (!data.title) next.title = "Введите название";
    if (!data.imageUrl) next.imageUrl = "Вставьте ссылку на фото";
    if (!data.album) next.album = "Укажите альбом";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit(data);
  };

  const url = form.imageUrl.trim();
  const isEdit = !!photo;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        noValidate
      >
        <div className="modal-head">
          <h2 id="modal-title">
            {isEdit ? "Редактировать фото" : "Новое фото"}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="preview">
          {url && !previewFailed ? (
            <img
              src={url}
              alt="Предпросмотр"
              style={{ filter: getFilter(form.filter).css }}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div className="img-fallback">
              <ImageIcon width={28} height={28} />
              <span>
                {previewFailed
                  ? "По этой ссылке фото не открывается"
                  : "Здесь появится предпросмотр"}
              </span>
            </div>
          )}
        </div>

        <label className="field">
          <span>Название</span>
          <input
            value={form.title}
            onChange={setField("title")}
            placeholder="Например, Закат на море"
            autoFocus
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <small className="field-error">{errors.title}</small>
          )}
        </label>

        <label className="field">
          <span>Ссылка на фото</span>
          <input
            value={form.imageUrl}
            onChange={setField("imageUrl")}
            placeholder="https://…"
            inputMode="url"
            aria-invalid={!!errors.imageUrl}
          />
          {errors.imageUrl && (
            <small className="field-error">{errors.imageUrl}</small>
          )}
        </label>

        <label className="field">
          <span>Альбом</span>
          <select
            value={form.album}
            onChange={setField("album")}
            aria-invalid={!!errors.album}
          >
            <option value="">Выберите альбом</option>
            {ALBUMS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {form.album && !ALBUMS.includes(form.album) && (
              <option value={form.album}>{form.album}</option>
            )}
          </select>
          {errors.album && (
            <small className="field-error">{errors.album}</small>
          )}
        </label>

        <fieldset className="field">
          <legend>Фильтр</legend>
          <div className="filter-picker" role="radiogroup">
            {FILTER_OPTIONS.map((f) => (
              <button
                type="button"
                key={f.value}
                role="radio"
                aria-checked={form.filter === f.value}
                className={`filter-option${form.filter === f.value ? " is-active" : ""}`}
                onClick={() =>
                  setForm((prev) => ({ ...prev, filter: f.value }))
                }
              >
                <span className="swatch" style={{ filter: f.css }} />
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PhotoModal;
