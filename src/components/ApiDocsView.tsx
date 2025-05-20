'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export const ApiDocsView: React.FC = () => (
  <div className="flex-1 overflow-auto p-4">
    <SwaggerUI url="/swagger.json" />
  </div>
);

export default ApiDocsView;
