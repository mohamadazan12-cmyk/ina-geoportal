import React from 'react';
import { TileLayer } from 'react-leaflet';
import { BasemapType } from '../../types/map';
import { BASEMAP_CONFIGS } from '../../constants/basemaps';

export { BASEMAP_CONFIGS };

interface BasemapControllerProps {
  basemap: BasemapType;
}

export const BasemapController: React.FC<BasemapControllerProps> = ({ basemap }) => {
  const current = BASEMAP_CONFIGS[basemap] || BASEMAP_CONFIGS.osm;

  return (
    <TileLayer
      key={basemap}
      url={current.url}
      attribution={current.attribution}
      maxZoom={current.maxZoom}
      subdomains={current.subdomains || 'abc'}
      zIndex={1}
      eventHandlers={{
        tileerror: () => {
          // Gracefully suppress single tile errors without breaking map canvas
        },
      }}
    />
  );
};
