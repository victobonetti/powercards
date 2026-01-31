import { useEffect, useState } from "react";
import { tagApi } from "@/lib/api";
import { TagStats } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Tag as TagIcon, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";

export function TagList() {
    const [tags, setTags] = useState<TagStats[]>([]);
    const [filteredTags, setFilteredTags] = useState<TagStats[]>([]);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [sort, setSort] = useState<"name" | "count">("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTag, setDeleteTag] = useState<TagStats | null>(null);

    const { toast } = useToast();

    // Fetch all tags stats (client-side filtering/sorting for now since list is usually smaller than cards)
    const fetchTags = async () => {
        try {
            const response = await tagApi.v1TagsStatsGet();
            setTags(response.data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch tags", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        let result = [...tags];

        // Filter
        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            result = result.filter(tag => tag.name?.toLowerCase().includes(lowerSearch));
        }

        // Sort
        result.sort((a, b) => {
            if (sort === "name") {
                const nameA = a.name?.toLowerCase() || "";
                const nameB = b.name?.toLowerCase() || "";
                return sortDirection === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            } else {
                const countA = a.noteCount || 0;
                const countB = b.noteCount || 0;
                return sortDirection === "asc" ? countA - countB : countB - countA;
            }
        });

        setFilteredTags(result);
    }, [tags, debouncedSearch, sort, sortDirection]);

    const toggleSort = (field: "name" | "count") => {
        if (sort === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSort(field);
            setSortDirection("asc");
        }
    };

    const handleDeleteClick = (tag: TagStats) => {
        setDeleteTag(tag);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTag || !deleteTag.id) return;

        try {
            await tagApi.v1TagsIdDelete(deleteTag.id);
            setTags(tags.filter(t => t.id !== deleteTag.id));
            setIsDeleteOpen(false);
            setDeleteTag(null);
            toast({ title: "Success", description: "Tag deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete tag", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TagIcon className="h-5 w-5" />
                            Tags
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({filteredTags.length} tags)
                            </span>
                        </CardTitle>
                        <Input
                            placeholder="Search tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                                    Name
                                    {sort === "name" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "desc" ? "rotate-180" : ""}`} />}
                                </TableHead>
                                <TableHead className="cursor-pointer w-32 text-right" onClick={() => toggleSort("count")}>
                                    Notes
                                    {sort === "count" && <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortDirection === "desc" ? "rotate-180" : ""}`} />}
                                </TableHead>
                                <TableHead className="w-20 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTags.map((tag) => (
                                <TableRow key={tag.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                                            {tag.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {tag.noteCount}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteClick(tag)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredTags.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                        No tags found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Tag</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the tag <strong>{deleteTag?.name}</strong>?
                            <br />
                            This will remove the tag from {deleteTag?.noteCount} notes. The notes will not be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete Tag</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
