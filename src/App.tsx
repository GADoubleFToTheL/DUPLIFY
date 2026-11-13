import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { DevBuild } from './ui/screens/dev/DevBuild';
import { DevParts } from './ui/screens/dev/DevParts';

function Placeholder() {
  return (
    <div className="screen center">
      <h1 className="title">Duplify</h1>
    </div>
  );
}

export function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/dev/teile" component={DevParts} />
        <Route path="/dev/bauen" component={DevBuild} />
        <Route component={Placeholder} />
      </Switch>
    </Router>
  );
}
