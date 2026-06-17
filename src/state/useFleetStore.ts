import { create } from 'zustand'
import { POLICE } from '@/config/constants'
import type { PoliceClassId } from '@/game/vehicles/policeCatalog'

interface FleetStore {
  /** Class of each police pool slot. Visibility/transforms are driven via refs;
   *  only the class (which model to show) needs to be reactive. */
  policeClasses: PoliceClassId[]
  setPoliceClasses: (classes: PoliceClassId[]) => void
}

export const useFleetStore = create<FleetStore>((set) => ({
  policeClasses: new Array<PoliceClassId>(POLICE.maxUnits).fill('patrol'),
  setPoliceClasses: (policeClasses) => set({ policeClasses }),
}))
