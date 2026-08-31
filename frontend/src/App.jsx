import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useSimulation } from './hooks/useSimulation';

import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Spectrum from './pages/Spectrum';
import AIModel from './pages/AIModel';
import Explainability from './pages/Explainability';
import Results from './pages/Results';

export function App() {
  const {
    simulationState,
    status,
    speed,
    isConnected,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    setSimulationSpeed,
    stepSimulation,
    stopSimulation,
    resetSimulation,
  } = useSimulation();

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
        <Navbar isConnected={isConnected} status={status} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            <Routes>
              <Route
                path="/"
                element={<Dashboard simulationState={simulationState} status={status} />}
              />
              <Route
                path="/simulation"
                element={
                  <Simulation
                    simulationState={simulationState}
                    status={status}
                    speed={speed}
                    startSimulation={startSimulation}
                    pauseSimulation={pauseSimulation}
                    resumeSimulation={resumeSimulation}
                    setSimulationSpeed={setSimulationSpeed}
                    stepSimulation={stepSimulation}
                    stopSimulation={stopSimulation}
                    resetSimulation={resetSimulation}
                  />
                }
              />
              {/* Spectrum & Privacy Combined */}
              <Route
                path="/spectrum"
                element={<Spectrum simulationState={simulationState} />}
              />
              <Route
                path="/privacy"
                element={<Spectrum simulationState={simulationState} />}
              />
              <Route path="/ai-model" element={<AIModel />} />
              <Route
                path="/explainability"
                element={<Explainability simulationState={simulationState} />}
              />
              {/* Scenarios & Results Combined */}
              <Route path="/scenarios" element={<Results />} />
              <Route path="/results" element={<Results />} />
              {/* Redirect old vehicles route to simulation */}
              <Route path="/vehicles" element={<Navigate to="/simulation" replace />} />
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
