import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import HensPage from './pages/HensPage';
import H2Page from './pages/H2Page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="hens" element={<HensPage />} />
          <Route path="h2" element={<H2Page />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}