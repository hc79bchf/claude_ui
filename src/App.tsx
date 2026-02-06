import { Layout } from './components/layout/Layout';
import { View } from './components/layout/NavRail';

function MainContent({ view }: { view: View }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <p className="text-lg">
        {view.charAt(0).toUpperCase() + view.slice(1)} View
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      {(view) => <MainContent view={view} />}
    </Layout>
  );
}
