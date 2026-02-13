import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaFolder, FaDownload, FaHome, 
  FaArrowLeft, FaSort, FaSortUp, FaSortDown,
  FaFilePdf, FaFileImage, FaFileVideo, FaFileAudio,
  FaFileArchive, FaFileCode, FaFileWord, FaFileExcel,
  FaFilePowerpoint, FaFileAlt
} from 'react-icons/fa';
import moment from 'moment';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const encodePathForUrl = (inputPath = '') =>
  inputPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [parentPath, setParentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path) => {
    setLoading(true);
    setError(null);
    try {
      const encodedPath = encodePathForUrl(path);
      const response = await axios.get(`${API_BASE}/api/files/${encodedPath}`);
      setItems(response.data.items || []);
      setParentPath(response.data.parentPath || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching files');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    }
  };

  const getFileIcon = (extension) => {
    const iconMap = {
      '.pdf': <FaFilePdf className="file-icon pdf" />,
      '.jpg': <FaFileImage className="file-icon image" />,
      '.jpeg': <FaFileImage className="file-icon image" />,
      '.png': <FaFileImage className="file-icon image" />,
      '.gif': <FaFileImage className="file-icon image" />,
      '.mp4': <FaFileVideo className="file-icon video" />,
      '.mov': <FaFileVideo className="file-icon video" />,
      '.mp3': <FaFileAudio className="file-icon audio" />,
      '.wav': <FaFileAudio className="file-icon audio" />,
      '.zip': <FaFileArchive className="file-icon archive" />,
      '.rar': <FaFileArchive className="file-icon archive" />,
      '.tar': <FaFileArchive className="file-icon archive" />,
      '.gz': <FaFileArchive className="file-icon archive" />,
      '.js': <FaFileCode className="file-icon code" />,
      '.html': <FaFileCode className="file-icon code" />,
      '.css': <FaFileCode className="file-icon code" />,
      '.json': <FaFileCode className="file-icon code" />,
      '.doc': <FaFileWord className="file-icon word" />,
      '.docx': <FaFileWord className="file-icon word" />,
      '.xls': <FaFileExcel className="file-icon excel" />,
      '.xlsx': <FaFileExcel className="file-icon excel" />,
      '.ppt': <FaFilePowerpoint className="file-icon powerpoint" />,
      '.pptx': <FaFilePowerpoint className="file-icon powerpoint" />,
    };
    return iconMap[extension] || <FaFileAlt className="file-icon default" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDownloadUrl = (itemPath) => {
    const encodedPath = encodePathForUrl(itemPath);
    return `${API_BASE}/api/download/${encodedPath}`;
  };

  const handleDownload = (item) => {
    const url = getDownloadUrl(item.path);
    window.location.href = url;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="sort-icon" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="sort-icon active" /> : 
      <FaSortDown className="sort-icon active" />;
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'size') {
      aValue = a.isDirectory ? 0 : a.size;
      bValue = b.isDirectory ? 0 : b.size;
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredItems = sortedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <h1>File Browser</h1>
        <div className="path-navigation">
          <button onClick={() => setCurrentPath('')} className="nav-btn">
            <FaHome /> Root
          </button>
          {parentPath && (
            <button onClick={() => setCurrentPath(parentPath)} className="nav-btn">
              <FaArrowLeft /> Back
            </button>
          )}
          <div className="current-path">
            Current: /{currentPath}
          </div>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <div className="container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="file-list">
            <div className="file-list-header">
              <div className="col-name" onClick={() => handleSort('name')}>
                Name {getSortIcon('name')}
              </div>
              <div className="col-size" onClick={() => handleSort('size')}>
                Size {getSortIcon('size')}
              </div>
              <div className="col-modified" onClick={() => handleSort('modifiedTime')}>
                Modified {getSortIcon('modifiedTime')}
              </div>
              <div className="col-actions">Actions</div>
            </div>

            <div className="file-list-body">
              {filteredItems.length === 0 ? (
                <div className="empty-message">No files found</div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.path}
                    className={`file-item ${item.isDirectory ? 'directory' : 'file'}`}
                  >
                    <div 
                      className="col-name"
                      onClick={() => item.isDirectory && handleItemClick(item)}
                    >
                      {item.isDirectory ? (
                        <FaFolder className="folder-icon" />
                      ) : (
                        getFileIcon(item.extension)
                      )}
                      <span className="item-name">{item.name}</span>
                    </div>
                    
                    <div className="col-size">
                      {item.isDirectory ? '-' : formatFileSize(item.size)}
                    </div>
                    
                    <div className="col-modified">
                      {moment(item.modifiedTime).format('YYYY-MM-DD HH:mm')}
                    </div>
                    
                    <div className="col-actions">
                      {!item.isDirectory && (
                        <button
                          onClick={() => handleDownload(item)}
                          className="download-btn"
                          title="Download"
                        >
                          <FaDownload />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
