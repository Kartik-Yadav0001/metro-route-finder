# Installation Guide

## Frontend

1. Open `frontend/`
2. Run `npm install`
3. Run `npm run dev`

## Backend

1. Open `backend/`
2. Run `cmake -S . -B build`
3. Run `cmake --build build`
4. Run the generated executable

On Windows, run the commands in PowerShell and open the generated `.exe` files from the `build/` directory created by CMake.

## Requirements

- Node.js 18+
- CMake 3.20+
- C++17 compiler
