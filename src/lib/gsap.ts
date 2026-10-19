import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Registering the hook once keeps every animation in the app inside a scoped,
// auto-cleaned gsap context.
gsap.registerPlugin(useGSAP);

gsap.defaults({ ease: 'power2.out' });

export { gsap, useGSAP };
