import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, Button, Chip } from "../../components/ui";

interface ModuleWithMockTest {
  module: { id: string; title: string; position: number };
  mockTest: { id: string; title: string; status: string } | null;
}

export default function CourseMockTests({ courseId }: { courseId: string }) {
  const [data, setData] = useState<ModuleWithMockTest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api<{ modules: ModuleWithMockTest[] }>(`/admin/courses/${courseId}/mock-tests`)
      .then(d => {
        setData(d.modules);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  if (loading) return <div className="text-muted">Loading modules...</div>;

  return (
    <Card className="space-y-4">
      <div className="mb-3">
        <h2 className="font-semibold text-ink">Module Mock Tests</h2>
        <p className="text-sm text-muted">Each module can have exactly one dedicated Mock Test.</p>
      </div>

      {data.length === 0 && <div className="text-sm text-faint">No modules found in this course. Add modules in the Curriculum tab first.</div>}

      <div className="space-y-3">
        {data.map(({ module, mockTest }, i) => (
          <div key={module.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-faint">Module {i + 1}</div>
              <div className="font-semibold text-ink">{module.title}</div>
            </div>
            
            <div className="flex items-center gap-3">
              {mockTest ? (
                <>
                  <Chip tone={mockTest.status === "published" ? "success" : "warning"}>
                    {mockTest.status}
                  </Chip>
                  <Link to={`/admin/modules/${module.id}/mock-test`}>
                    <Button size="sm">Manage Test</Button>
                  </Link>
                </>
              ) : (
                <Link to={`/admin/modules/${module.id}/mock-test`}>
                  <Button size="sm" variant="outline">+ Create Test</Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
