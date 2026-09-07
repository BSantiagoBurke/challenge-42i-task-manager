import { Route, Routes } from 'react-router-dom';
import { TaskListPage } from './pages/TaskListPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<TaskListPage />} />
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
    </Routes>
  );
}

export default App;
