'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Globe,
  MessageSquare,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Admin Dashboard Component
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SEOAgent Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor users, conversations, connections, and publishing activities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="publishing" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Publishing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersView />
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <ConnectionsView />
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <ConversationsView />
        </TabsContent>

        <TabsContent value="publishing" className="mt-6">
          <PublishingView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Users View Component
function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 50 });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...(search && { search })
      });
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.offset]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchUsers();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({pagination.total})</CardTitle>
          <CardDescription>All registered users and their activity stats</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Websites</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Connections</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.plan === 1 ? 'default' : 'secondary'}>
                      {user.subscription?.tier || (user.plan === 1 ? 'Paid' : 'Free')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.stats.websites_managed} managed</div>
                      <div className="text-muted-foreground">
                        {user.stats.websites_total} total
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.stats.articles_published} published</div>
                      <div className="text-muted-foreground">
                        {user.stats.articles_generated} generated
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.stats.gsc_connections > 0 && (
                        <Badge variant="outline" className="text-xs">GSC</Badge>
                      )}
                      {user.stats.cms_connections > 0 && (
                        <Badge variant="outline" className="text-xs">CMS</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.stats.conversations}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.has_more && (
        <div className="flex justify-center">
          <Button
            onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            variant="outline"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

// Connections View Component
function ConnectionsView() {
  const [connections, setConnections] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.connections);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading connections...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_websites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">GSC Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gsc_connected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">SEOAgent.js Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.seoagentjs_active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CMS Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cms_connected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fully Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fully_connected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Website Connections</CardTitle>
              <CardDescription>Connection status for all websites</CardDescription>
            </div>
            <Button onClick={fetchConnections} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>GSC</TableHead>
                <TableHead>SEOAgent.js</TableHead>
                <TableHead>CMS</TableHead>
                <TableHead>Hosting</TableHead>
                <TableHead>Managed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell className="font-medium">
                    {connection.cleaned_domain || connection.domain}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {connection.user_email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.gsc_status)}
                      <span className="text-sm">{connection.gsc_status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.seoagentjs_status)}
                      <span className="text-sm">{connection.seoagentjs_status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.cms_status)}
                      {connection.cms_connection && (
                        <Badge variant="outline" className="text-xs">
                          {connection.cms_connection.type}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.hosting_status)}
                      <span className="text-sm">{connection.hosting_status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {connection.is_managed ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Conversations View Component
function ConversationsView() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 50 });

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });
      const response = await fetch(`/api/admin/chat/conversations?${params}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [pagination.offset]);

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading conversations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Agent Conversations ({pagination.total})
        </h2>
        <Button onClick={fetchConversations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {conversations.map((conversation) => (
          <Card key={conversation.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{conversation.title || 'Untitled Conversation'}</CardTitle>
                  <CardDescription>
                    {conversation.user_email} • {conversation.message_count} messages
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent Messages:</div>
                {conversation.recent_messages?.map((msg: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={msg.message_type === 'user' ? 'default' : 'secondary'} className="text-xs">
                        {msg.message_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination.has_more && (
        <div className="flex justify-center">
          <Button
            onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            variant="outline"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

// Publishing View Component
function PublishingView() {
  const [articles, setArticles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchPublishing = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter })
      });
      const response = await fetch(`/api/admin/publishing?${params}`);
      const data = await response.json();
      if (data.success) {
        setArticles(data.articles);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching publishing activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishing();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      generating: 'outline',
      generated: 'default',
      publishing: 'outline',
      published: 'default',
      generation_failed: 'destructive',
      publishing_failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading publishing activities...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Briefs Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.briefs_created}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.articles_published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.articles_generating + stats.articles_publishing}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.articles_failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Publishing Activities</CardTitle>
              <CardDescription>Recent article generation and publishing</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStatusFilter('')} variant={statusFilter === '' ? 'default' : 'outline'} size="sm">
                All
              </Button>
              <Button onClick={() => setStatusFilter('published')} variant={statusFilter === 'published' ? 'default' : 'outline'} size="sm">
                Published
              </Button>
              <Button onClick={() => setStatusFilter('generation_failed')} variant={statusFilter === 'generation_failed' ? 'default' : 'outline'} size="sm">
                Errors
              </Button>
              <Button onClick={fetchPublishing} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate">{article.title}</div>
                    {article.public_url && (
                      <a
                        href={article.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View Live
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.user_email}
                  </TableCell>
                  <TableCell className="text-sm">{article.website_domain}</TableCell>
                  <TableCell>{getStatusBadge(article.status)}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {article.quality_score && (
                        <div>Quality: {article.quality_score.toFixed(1)}</div>
                      )}
                      {article.seo_score && (
                        <div>SEO: {article.seo_score.toFixed(1)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(article.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
