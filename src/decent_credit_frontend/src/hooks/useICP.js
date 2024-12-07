// import { useState, useEffect } from 'react';
// import { createActor } from '../services/IDL';

// export function useICP() {
//   const [actor, setActor] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState('Initializing...');

//   useEffect(() => {
//     async function init() {
//       try {
//         setConnectionStatus('Connecting...');
//         const newActor = await createActor();
//         setActor(newActor);
//         setConnectionStatus('Connected');
//       } catch (error) {
//         console.error('Initialization error:', error);
//         setConnectionStatus('Connection Failed');
//       }
//     }
//     init();
//   }, []);

//   return { actor, connectionStatus };
// }