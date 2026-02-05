import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

export default function Home() {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projects, setProjects] = useState([]);

  const handleCreateProject = () => {
    if (!projectTitle.trim()) return;
    
    const newProject = {
      id: Date.now(),
      title: projectTitle,
      createdAt: new Date().toISOString(),
      thumbnail: null
    };
    
    setProjects([newProject, ...projects]);
    setProjectTitle('');
    setShowCreateDialog(false);
    
    // Navigate to editor with project
    navigate('/editor', { state: { project: newProject } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-2">String Art Studio</h1>
          <p className="text-gray-500">Create beautiful thread art patterns</p>
        </div>

        {/* Create New Project Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] border-0 p-12 cursor-pointer hover:shadow-xl transition-all group"
          >
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-medium">CREATE NEW PROJECT</h2>
            </div>
          </Card>
        </motion.div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Recent Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                    <div onClick={() => navigate('/editor', { state: { project } })}>
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        {project.thumbnail ? (
                          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FolderOpen className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjects(projects.filter(p => p.id !== project.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Create Project Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create new project</DialogTitle>
              <DialogDescription>
                Enter a title for your string art project
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="title" className="text-sm text-gray-600 mb-2 block">
                Project title
              </Label>
              <Input
                id="title"
                placeholder="Enter title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">Please enter title of the project.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateProject}
                disabled={!projectTitle.trim()}
                className="text-[#ff6b35] border-[#ff6b35] hover:bg-[#ff6b35]/10"
              >
                Create
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!projectTitle.trim()}
                className="bg-[#ff6b35] hover:bg-[#e55a2b]"
              >
                Create and open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}