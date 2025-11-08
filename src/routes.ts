import { lazy } from 'solid-js';
import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import AboutData from './pages/about.data';
import ScriptureReader from './pages/scripture-reader';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/scripture',
    component: ScriptureReader,
  },
  {
    path: '/about',
    component: lazy(() => import('./pages/about')),
    data: AboutData,
  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
