# Forecast Module

The Forecast module enables the creation, management, and execution of time-series forecasts through a dynamic node-based graph structure.

## Overview

This module implements a graph-based forecasting system where users can build forecasting models by connecting different types of nodes together. It provides services and controllers for managing forecasts, forecast nodes (the building blocks), and the connections between them (edges).

## Database Schema

The module works with the following Supabase tables:

- **forecasts**: Stores metadata about each forecast (name, date range, etc.)
- **forecast_nodes**: Stores the nodes (calculation components) of each forecast
- **forecast_edges**: Stores the connections between nodes

## Node Types

The system supports the following node types:

1. **DATA**: References existing variables from the variables table
2. **CONSTANT**: Represents fixed numerical values
3. **OPERATOR**: Performs mathematical operations (+, -, *, /, etc.)
4. **METRIC**: Computes values based on historical data and budget targets
5. **SEED**: Used to initialize forecast calculation

## API Endpoints

### Forecasts

- `POST /forecasts` - Create a new forecast
- `GET /forecasts` - List all forecasts (filtered by organization)
- `GET /forecasts/:id` - Get a specific forecast
- `PATCH /forecasts/:id` - Update a forecast's metadata
- `DELETE /forecasts/:id` - Delete a forecast

### Nodes

- `POST /forecasts/:forecastId/nodes` - Add a node to a forecast
- `GET /forecasts/:forecastId/nodes` - Get all nodes in a forecast
- `GET /forecasts/:forecastId/nodes/:nodeId` - Get a specific node
- `PATCH /forecasts/:forecastId/nodes/:nodeId` - Update a node
- `DELETE /forecasts/:forecastId/nodes/:nodeId` - Delete a node

### Edges

- `POST /forecasts/:forecastId/edges` - Create a connection between nodes
- `GET /forecasts/:forecastId/edges` - Get all connections in a forecast
- `GET /forecasts/:forecastId/edges/:edgeId` - Get a specific connection
- `DELETE /forecasts/:forecastId/edges/:edgeId` - Delete a connection

## Security

All endpoints are protected by Supabase Row Level Security policies. Users can only access forecasts within organizations they are members of. 