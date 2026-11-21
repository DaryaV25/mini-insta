import { useState } from "react";
import { Link } from "react-router-dom";
import { getFilter } from "../utils/filters";
import { EditIcon, TrashIcon, HeartIcon, ImageIcon } from "./icons";

function PhotoCard({ photo, onEdit, onDelete }) {
  const [failed, setFailed] = useState(false);
  const filter = getFilter(photo.filter);
  const href = `/photos/${photo.id}`;

  const image = (
    <img
      src={photo.imageUrl}
      alt={photo.title}
      loading="lazy"
      style={{ filter: filter.css }}
      onError={() => setFailed(true)}
    />
  );

  return (
    <article className={`card${photo.pending ? " is-pending" : ""}`}>
      <div className="card-media">
        {failed ? (
          <div className="img-fallback">
            <ImageIcon width={28} height={28} />
            <span>Фото не загрузилось</span>
          </div>
        ) : photo.pending ? (
          image
        ) : (
          <Link to={href} className="card-media-link">
            {image}
          </Link>
        )}

        {photo.filter !== "none" && (
          <span className="filter-tag">{filter.label}</span>
        )}

        {photo.pending ? (
          <span className="saving-badge">Сохраняется…</span>
        ) : (
          <div className="card-actions">
            <button
              className="icon-btn icon-btn-light"
              onClick={() => onEdit(photo)}
              title="Редактировать"
              aria-label={`Редактировать «${photo.title}»`}
            >
              <EditIcon />
            </button>
            <button
              className="icon-btn icon-btn-light icon-btn-danger"
              onClick={() => onDelete(photo.id)}
              title="Удалить"
              aria-label={`Удалить «${photo.title}»`}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
        <h3>
          {photo.pending ? (
            photo.title
          ) : (
            <Link to={href} className="card-title-link">
              {photo.title}
            </Link>
          )}
        </h3>
        <div className="card-meta">
          <span className="chip">{photo.album}</span>
          <span className="likes">
            <HeartIcon width={16} height={16} />
            {photo.likes}
          </span>
        </div>
      </div>
    </article>
  );
}

export default PhotoCard;
