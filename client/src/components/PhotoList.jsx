import { useState, useEffect } from "react";
import {
  fetchPhotos,
  addPhoto,
  updatePhoto,
  deletePhoto,
  isCancel,
  getErrorMessage,
} from "../api";
import useDebounce from "../hooks/useDebounce";
import PhotoCard from "./PhotoCard";
import PhotoModal from "./PhotoModal";
import Toast from "./Toast";
import { ALBUMS } from "../utils/albums";
import {
  SearchIcon,
  PlusIcon,
  AlertIcon,
  RefreshIcon,
  ImageIcon,
} from "./icons";

const SKELETON_HEIGHTS = [220, 300, 260, 340, 240, 290, 320, 250];

function PhotoList() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [notice, setNotice] = useState(null);

  const [modal, setModal] = useState(null);

  const [albumFilter, setAlbumFilter] = useState("Все");
  const [sortBy, setSortBy] = useState("id");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const showNotice = (type, text) => setNotice({ type, text });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    document.title = `Кадр — фото: ${photos.length}`;
  }, [photos.length]);

  useEffect(() => {
    const controller = new AbortController();
    const query = debouncedSearch.trim();

    setLoading(true);
    setError(null);

    fetchPhotos(query ? { search: query } : undefined, controller.signal)
      .then((res) => setPhotos(res.data))
      .catch((err) => {
        if (isCancel(err)) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, reloadKey]);

  const handleAdd = async (data) => {
    const tempId = Date.now();
    setPhotos((prev) => [
      ...prev,
      { id: tempId, ...data, likes: 0, pending: true },
    ]);
    setModal(null);

    try {
      const res = await addPhoto(data);
      setPhotos((prev) => prev.map((p) => (p.id === tempId ? res.data : p)));
      showNotice("success", `Фото «${data.title}» добавлено`);
    } catch (err) {
      setPhotos((prev) => prev.filter((p) => p.id !== tempId));
      showNotice("error", `Не удалось добавить фото: ${getErrorMessage(err)}`);
    }
  };

  const handleDelete = async (id) => {
    const index = photos.findIndex((p) => p.id === id);
    if (index === -1) return;
    const removed = photos[index];

    setPhotos((prev) => prev.filter((p) => p.id !== id));

    try {
      await deletePhoto(id);
      showNotice("success", `Фото «${removed.title}» удалено`);
    } catch (err) {
      setPhotos((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      showNotice("error", `Не удалось удалить фото: ${getErrorMessage(err)}`);
    }
  };

  const handleUpdate = async (id, data) => {
    const previous = photos.find((p) => p.id === id);
    if (!previous) return;

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, pending: true } : p)),
    );
    setModal(null);

    try {
      const res = await updatePhoto(id, data);
      setPhotos((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      showNotice("success", "Изменения сохранены");
    } catch (err) {
      setPhotos((prev) => prev.map((p) => (p.id === id ? previous : p)));
      showNotice(
        "error",
        `Не удалось сохранить изменения: ${getErrorMessage(err)}`,
      );
    }
  };

  const handleModalSubmit = (data) =>
    modal.photo ? handleUpdate(modal.photo.id, data) : handleAdd(data);

  const albumNames = [...new Set(photos.map((p) => p.album))];
  const albumTabs = [
    "Все",
    ...ALBUMS,
    ...photos.map((p) => p.album).filter((a) => a && !ALBUMS.includes(a)),
  ].filter((a, i, arr) => arr.indexOf(a) === i);

  const visiblePhotos = photos
    .filter((p) => albumFilter === "Все" || p.album === albumFilter)
    .sort((a, b) => {
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return a.id - b.id;
    });

  const isSearching = search.trim() !== "";

  let content;
  if (loading && photos.length === 0) {
    content = (
      <div className="grid" aria-busy="true" aria-label="Загрузка">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h }} />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <div className="state">
        <span className="state-icon state-icon-error">
          <AlertIcon width={28} height={28} />
        </span>
        <h2>Не получилось загрузить фото</h2>
        <p>{error}</p>
        <button
          className="btn btn-primary"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          <RefreshIcon /> Повторить
        </button>
      </div>
    );
  } else if (visiblePhotos.length === 0) {
    content = (
      <div className="state">
        <span className="state-icon">
          <ImageIcon width={28} height={28} />
        </span>
        {isSearching ? (
          <>
            <h2>Ничего не найдено</h2>
            <p>
              По запросу «{search.trim()}» нет фото. Попробуйте другое слово.
            </p>
            <button className="btn btn-ghost" onClick={() => setSearch("")}>
              Сбросить поиск
            </button>
          </>
        ) : (
          <>
            <h2>Здесь пока пусто</h2>
            <p>Добавьте первое фото — выберите фильтр и альбом.</p>
            <button
              className="btn btn-primary"
              onClick={() => setModal({ photo: null })}
            >
              <PlusIcon /> Добавить фото
            </button>
          </>
        )}
      </div>
    );
  } else {
    content = (
      <div className={`grid${loading ? " is-refreshing" : ""}`}>
        {visiblePhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onEdit={(p) => setModal({ photo: p })}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Мои фотографии</h1>
          <p className="muted">
            Всего фото: {photos.length}
            {albumNames.length > 0 && ` · альбомов: ${albumNames.length}`}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModal({ photo: null })}
        >
          <PlusIcon /> Добавить фото
        </button>
      </div>

      <div className="toolbar">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или альбому"
            aria-label="Поиск по названию или альбому"
          />
        </label>

        <label className="sort">
          <span>Сортировка</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="id">По дате добавления</option>
            <option value="likes">По лайкам</option>
            <option value="title">По названию</option>
          </select>
        </label>
      </div>

      <div className="tabs" role="tablist" aria-label="Альбомы">
        {albumTabs.map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={albumFilter === a}
            className={`tab${albumFilter === a ? " is-active" : ""}`}
            onClick={() => setAlbumFilter(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {content}

      {modal && (
        <PhotoModal
          photo={modal.photo}
          albums={albumNames}
          onClose={() => setModal(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}

export default PhotoList;
