import React, { useState } from 'react';
import VehicleTable from '../components/VehicleTable';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import api from '../api/api';

export function Vehicles({ simulationState }) {
  const { vehicles = [] } = simulationState;
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [explanation, setExplanation] = useState(null);

  const handleSelectVehicle = async (v) => {
    setSelectedVehicle(v);
    try {
      const res = await api.getExplanation(v.vehicle_id);
      setExplanation(res.data);
    } catch (err) {
      console.error("Failed to fetch explanation:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Vehicle Agents Overview</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Detailed metrics and channel selections for each autonomous vehicle agent
        </p>
      </div>

      <VehicleTable
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        selectedVehicleId={selectedVehicle?.vehicle_id}
      />

      {selectedVehicle && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
            Selected Vehicle Inspection: {selectedVehicle.vehicle_id}
          </h3>
          <ExplainabilityPanel explanation={explanation} />
        </div>
      )}
    </div>
  );
}

export default Vehicles;
