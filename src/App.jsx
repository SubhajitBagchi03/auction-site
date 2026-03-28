import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuctionProvider } from './context/AuctionContext';
import Navbar from './components/Navbar';
import AuctionPage from './pages/AuctionPage';
import TeamDetailsPage from './pages/TeamDetailsPage';

export default function App() {
  return (
    <AuctionProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<AuctionPage />} />
          <Route path="/teams" element={<TeamDetailsPage />} />
        </Routes>
      </BrowserRouter>
    </AuctionProvider>
  );
}
