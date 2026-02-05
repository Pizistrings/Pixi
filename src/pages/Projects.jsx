import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Star, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Projects() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-updated_date'),
  });

  const createProjectMutation = useMutation({
    mutationFn: (title) => base44.entities.Project.create({ 
      title,
      status: 'draft',
      settings: {
        numPins: 200,
        numStrings: 3000,
        shape: 'circle',
        mode: 'color',
        brightness: 100,
        contrast: 100,
        sharpness: 0,
        cropArea: { x: 0, y: 0, width: 100, height: 100 },
        lineWidth: 0.3,
        lineOpacity: 0.15,
        numColors: 4,
        selectedColors: [
          { name: 'Cyan', hex: '#00b4d8', id: 'C' },
          { name: 'Magenta', hex: '#e63946', id: 'M' },
          { name: 'Yellow', hex: '#ffd60a', id: 'Y' },
          { name: 'Black', hex: '#1a1a1a', id: 'K' }
        ],
        colorDistribution: { C: 20, M: 20, Y: 20, K: 40 }
      }
    }),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateDialog(false);
      setNewProjectTitle('');
      window.location.href = createPageUrl('ProjectEditor') + '?id=' + newProject.id;
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => base44.entities.Project.update(id, { is_favorite: !is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-light text-gray-900">My Projects</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage your string art patterns</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            CREATE NEW PROJECT
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-64 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-6 bg-[#ff6b35] rounded-2xl flex items-center justify-center">
              <Plus className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">Create your first string art project to get started</p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white"
            >
              Create New Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link to={createPageUrl('ProjectEditor') + '?id=' + project.id}>
                    <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                      {project.image_url ? (
                        <img 
                          src={project.image_url} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-16 h-16 text-gray-300" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavoriteMutation.mutate({ id: project.id, is_favorite: project.is_favorite });
                        }}
                      >
                        <Star className={`w-4 h-4 ${project.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </Button>
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link to={createPageUrl('ProjectEditor') + '?id=' + project.id}>
                      <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(project.updated_date).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Delete this project?')) {
                            deleteProjectMutation.mutate(project.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Project Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm text-gray-600 mb-2 block">Project title</label>
              <Input
                placeholder="Enter title"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectTitle.trim()) {
                    createProjectMutation.mutate(newProjectTitle.trim());
                  }
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Please enter title of the project.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => newProjectTitle.trim() && createProjectMutation.mutate(newProjectTitle.trim())}
                disabled={!newProjectTitle.trim()}
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