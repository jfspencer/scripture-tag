import { Suspense, type Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();
  const isScriptureReader = () => location.pathname === '/scripture';

  return (
    <>
      {/* Hide navigation on scripture reader page */}
      {!isScriptureReader() && (
        <nav class="bg-gray-200 text-gray-900 px-4">
          <ul class="flex items-center">
            <li class="py-2 px-4">
              <A href="/" class="no-underline hover:underline">
                Home
              </A>
            </li>
            <li class="py-2 px-4">
              <A href="/scripture" class="no-underline hover:underline">
                Scripture Reader
              </A>
            </li>

            <li class="text-sm flex items-center space-x-1 ml-auto">
              <span>URL:</span>
              <input
                class="w-75px p-1 bg-white text-sm rounded-lg"
                type="text"
                readOnly
                value={location.pathname}
              />
            </li>
          </ul>
        </nav>
      )}

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;
