import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  fetchPhoto,
  fetchComments,
  fetchRelatedPhotos,
  fetchLikeStatus,
  toggleLike,
  addComment,
  updateComment,
  deleteComment,
  getErrorMessage,
} from "../api";
import useAuth from "../hooks/useAuth";
import { getFilter } from "../utils/filters";
import Toast from "../components/Toast";
import {
  ArrowLeftIcon,
  HeartIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  ImageIcon,
  AlertIcon,
  RefreshIcon,
} from "../components/icons";

const formatDate = (d) =>
  new Date(d).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function SafeImage({ photo, lazy }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="img-fallback">
        <ImageIcon width={28} height={28} />
        <span>Фото не загрузилось</span>
      </div>
    );
  }
  return (
    <img
      src={photo.imageUrl}
      alt={photo.title}
      loading={lazy ? "lazy" : undefined}
      style={{ filter: getFilter(photo.filter).css }}
      onError={() => setFailed(true)}
    />
  );
}

function PhotoView({ id }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [photo, setPhoto] = useState(null);
  const [related, setRelated] = useState([]);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const [notice, setNotice] = useState(null);
  const showNotice = (type, text) => setNotice({ type, text });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Фото + комментарии + похожие
  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0 });

    Promise.all([fetchPhoto(id), fetchComments(id), fetchRelatedPhotos(id)])
      .then(([p, c, r]) => {
        if (cancelled) return;
        setPhoto(p.data);
        setLikes(p.data.likes);
        setComments(c.data);
        setRelated(r.data);
        setStatus("ready");
        document.title = `Кадр — ${p.data.title}`;
      })
      .catch((err) => {
        if (cancelled) return;
        setError({
          notFound: err.response?.status === 404,
          message: getErrorMessage(err),
        });
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Поставил ли текущий пользователь лайк (зависит от того, кто вошёл)
  useEffect(() => {
    let cancelled = false;
    fetchLikeStatus(id)
      .then((res) => {
        if (cancelled) return;
        setLiked(res.data.liked);
        setLikes(res.data.likes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const handleLike = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (likeBusy) return;

    const prev = { liked, likes };
    setLiked(!liked);
    setLikes(likes + (liked ? -1 : 1));
    setLikeBusy(true);

    try {
      const res = await toggleLike(id);
      setLiked(res.data.liked);
      setLikes(res.data.likes);
    } catch (err) {
      setLiked(prev.liked);
      setLikes(prev.likes);
      showNotice("error", `Не удалось поставить лайк: ${getErrorMessage(err)}`);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || posting) return;

    setPosting(true);
    try {
      const res = await addComment(id, text);
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
    } catch (err) {
      showNotice("error", getErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditText(c.text);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const text = editText.trim();
    if (!text) return;

    try {
      const res = await updateComment(id, editingId, text);
      setComments((prev) =>
        prev.map((c) => (c.id === editingId ? res.data : c)),
      );
      setEditingId(null);
    } catch (err) {
      showNotice("error", getErrorMessage(err));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Удалить комментарий?")) return;
    try {
      await deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      showNotice("error", getErrorMessage(err));
    }
  };

  const back = (
    <Link to="/" className="back-link">
      <ArrowLeftIcon /> Все фото
    </Link>
  );

  if (status === "loading") {
    return (
      <div className="container">
        {back}
        <div className="photo-detail" aria-busy="true" aria-label="Загрузка">
          <div className="skeleton" style={{ height: 480 }} />
          <div className="skeleton" style={{ height: 480 }} />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container">
        {back}
        <div className="state">
          <span className="state-icon state-icon-error">
            <AlertIcon width={28} height={28} />
          </span>
          <h2>{error.notFound ? "Фото не найдено" : "Не получилось загрузить"}</h2>
          <p>
            {error.notFound
              ? "Возможно, его уже удалили."
              : error.message}
          </p>
          {error.notFound ? (
            <Link to="/" className="btn btn-primary">
              К списку фото
            </Link>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                setStatus("loading");
                setReloadKey((k) => k + 1);
              }}
            >
              <RefreshIcon /> Повторить
            </button>
          )}
        </div>
      </div>
    );
  }

  const filter = getFilter(photo.filter);
  const likeLabel = !user
    ? "Войдите, чтобы поставить лайк"
    : liked
      ? "Убрать лайк"
      : "Поставить лайк";

  return (
    <div className="container">
      {back}

      <article className="photo-detail">
        <div className="photo-detail-media">
          <SafeImage photo={photo} />
        </div>

        <div className="photo-detail-side">
          <div>
            <h1>{photo.title}</h1>
            <div className="photo-detail-meta">
              <span className="chip">{photo.album}</span>
              {photo.filter !== "none" && (
                <span className="muted">Фильтр: {filter.label}</span>
              )}
            </div>
          </div>

          <button
            className={`like-btn${liked ? " is-liked" : ""}`}
            onClick={handleLike}
            aria-pressed={liked}
            aria-label={`${likeLabel}: ${likes}`}
            title={likeLabel}
          >
            <HeartIcon fill={liked ? "currentColor" : "none"} />
            <span>{likes}</span>
          </button>

          <section className="comments" aria-label="Комментарии">
            <h2>Комментарии · {comments.length}</h2>

            {comments.length === 0 ? (
              <p className="muted">Пока никто не прокомментировал.</p>
            ) : (
              <ul className="comment-list">
                {comments.map((c) => {
                  const own = user && c.userId === user.id;
                  const canDelete = own || user?.role === "admin";
                  const editing = editingId === c.id;

                  return (
                    <li key={c.id} className="comment">
                      <span className="avatar" aria-hidden="true">
                        {c.author[0].toUpperCase()}
                      </span>
                      <div className="comment-body">
                        <div className="comment-head">
                          <b>{c.author}</b>
                          <span className="muted">
                            {formatDate(c.createdAt)}
                            {c.edited && " · изменено"}
                          </span>
                        </div>

                        {editing ? (
                          <form className="comment-edit" onSubmit={handleSaveEdit}>
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Escape" && setEditingId(null)
                              }
                              maxLength={500}
                              aria-label="Текст комментария"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="icon-btn"
                              title="Сохранить"
                              aria-label="Сохранить"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setEditingId(null)}
                              title="Отмена"
                              aria-label="Отмена"
                            >
                              <CloseIcon />
                            </button>
                          </form>
                        ) : (
                          <p>{c.text}</p>
                        )}
                      </div>

                      {!editing && canDelete && (
                        <div className="comment-actions">
                          {own && (
                            <button
                              className="icon-btn"
                              onClick={() => startEdit(c)}
                              title="Редактировать"
                              aria-label="Редактировать комментарий"
                            >
                              <EditIcon width={18} height={18} />
                            </button>
                          )}
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Удалить"
                            aria-label="Удалить комментарий"
                          >
                            <TrashIcon width={18} height={18} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {user ? (
              <form className="comment-form" onSubmit={handleAddComment}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Добавьте комментарий…"
                  maxLength={500}
                  aria-label="Новый комментарий"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={posting || !commentText.trim()}
                >
                  Отправить
                </button>
              </form>
            ) : (
              <p className="hint">
                <Link to="/login" className="link-inline">
                  Войдите
                </Link>
                , чтобы ставить лайки и писать комментарии.
              </p>
            )}
          </section>
        </div>
      </article>

      {related.length > 0 && (
        <section className="related" aria-label="Похожие фото">
          <h2>Похожие фото</h2>
          <div className="grid">
            {related.map((p) => (
              <Link key={p.id} to={`/photos/${p.id}`} className="card card-link">
                <div className="card-media">
                  <SafeImage photo={p} lazy />
                </div>
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <div className="card-meta">
                    <span className="chip">{p.album}</span>
                    <span className="likes">
                      <HeartIcon width={16} height={16} />
                      {p.likes}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}

// key={id}: при переходе к другому фото страница создаётся заново,
// поэтому старые комментарии и лайки не «протекают» на новое фото
function PhotoPage() {
  const { id } = useParams();
  return <PhotoView key={id} id={id} />;
}

export default PhotoPage;
