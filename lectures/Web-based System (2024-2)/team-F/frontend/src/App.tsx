import React, {useState} from 'react';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import RestaurantDetail from '@/components/RestaurantDetail';
import RecommendationModal from '@/components/RecommendationModal';
import GoogleMapComponent from '@/components/GoogleMap';
import LeftPanel from '@/components/LeftPanel';
import Markers from '@/components/Markers';
import Header from '@/components/Header';
import {useRecommendations} from '@/hooks/useRecommendations';
import {Bounds, getFixedBounds} from '@/utils/bounds';
import './App.css';

const App: React.FC = () => {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [scores, setScores] = useState<string>('0,0,0,0,0');
  const recommendations = useRecommendations(bounds, scores);

  const handleSearchAgain = (newBounds: google.maps.LatLngBounds | undefined) => {
    setBounds(getFixedBounds(newBounds));
  };


  return (
    <div className="app">
      <Header/>
      <div className="main-content">
        <Router>
          <LeftPanel setScores={setScores}/>
          <main className="panel center-panel">
            <GoogleMapComponent onSearchAgain={handleSearchAgain}>
              <Routes>
                <Route path="/" element={<></>}/>
                <Route path="/search" element={<RecommendationModal recommendations={recommendations}/>}/>
                <Route path="/restaurant/:id" element={<RestaurantDetail/>}/>
              </Routes>

              <Markers data={recommendations.data}/>
            </GoogleMapComponent>
          </main>
        </Router>
      </div>
    </div>
  );
};

export default App;