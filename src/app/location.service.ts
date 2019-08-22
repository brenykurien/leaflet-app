import { Injectable } from '@angular/core';
import { states } from '../assets/states_ap';
import { districts } from '../assets/districts_ap';


@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor() { }

  getStatesGeoJSON() {
    const statesGeoJSON = states;
    return statesGeoJSON;
  }

  getDistrictGeoJSON() {
    const districtsGeoJSON = districts;
    return districtsGeoJSON;
  }

}
