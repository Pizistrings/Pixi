import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date', 50),
    initialData: []
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(createPageUrl(`StringArt?projectId=${newProject.id}`));
    }
  });

  const handleCreateProject = (openImmediately = false) => {
    if (!projectTitle.trim()) return;
    
    createProjectMutation.mutate({
      title: projectTitle,
      status: 'draft',
      settings: {
        shape: 'circle_240',
        mode: 'multi',
        steps: 3000,
        fade: 30,
        min_distance: 30,
        color_run: 100,
        thickness: 1
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light text-gray-900 mb-3">String Art Studio</h1>
          <p className="text-gray-500">Transform images into beautiful thread art patterns</p>
        </motion.div>

        {/* Create New Project Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Card
            onClick={() => setShowNewDialog(true)}
            className="bg-[#ff6b35] hover:bg-[#e55a2b] transition-all cursor-pointer border-0 shadow-lg overflow-hidden group"
          >
            <div className="p-12 text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                transition={{ duration: 0.3 }}
                className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center"
              >
                <Plus className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-light text-white tracking-wide">
                CREATE NEW PROJECT
              </h2>
            </div>
          </Card>
        </motion.div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Clock className="w-4 h-4" />
              <h3 className="text-sm font-medium">Recent Projects</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    onClick={() => navigate(createPageUrl(`StringArt?projectId=${project.id}`))}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-0 overflow-hidden group"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {project.thumbnail_url ? (
                        <img
                          src={project.thumbnail_url}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Plus className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {project.is_favorite && (
                        <div className="absolute top-2 right-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(project.updated_date).toLocaleDateString()}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project title</Label>
              <Input
                id="title"
                placeholder="Enter title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject();
                  }
                }}
              />
              <p className="text-xs text-gray-500">Please enter title of the project.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateProject(false)}
              disabled={!projectTitle.trim() || createProjectMutation.isPending}
              className="text-[#ff6b35] border-[#ff6b35] hover:bg-[#ff6b35]/10"
            >
              Create
            </Button>
            <Button
              onClick={() => handleCreateProject(true)}
              disabled={!projectTitle.trim() || createProjectMutation.isPending}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
            >
              Create and open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}