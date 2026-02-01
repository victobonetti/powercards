import { useEffect, useState } from "react";
import { tagApi } from "@/lib/api";
import { TagStats } from "@/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Tag as TagIcon } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { DataTable, DataTableColumn } from "./ui/data-table";

export function TagList() {
    const [tags, setTags] = useState<TagStats[]>([]);
    const [totalTags, setTotalTags] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    // Backend sort is currently fixed to name asc in the modified resource, but we can update if needed.
    // For now, let's assume default sort.

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTag, setDeleteTag] = useState<TagStats | null>(null);

    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchTags = async (page: number) => {
        try {
            // Updated to match generated client signature: (page, perPage, search)
            const response = await tagApi.v1TagsStatsGet(page, perPage, debouncedSearch);

            // The generated return type might be PaginatedResponseTagStats which has 'data' and 'meta' fields?
            // Need to check the alignment with my Backend output.
            // Backend returns PaginatedResponse<TagStats> which has fields 'meta' and 'data'.
            // The generated client usually unwraps the response.data in axios?
            // Wait, generated client returns AxiosPromise<PaginatedResponseTagStats>.
            // So response.data is PaginatedResponseTagStats.

            // Let's assume standard structure based on backend DTO.
            const paginatedData = response.data;
            // paginatedData should have .data (list) and .pagination (meta)
            setTags(paginatedData.data || []);
            setTotalTags(paginatedData.pagination?.total || 0);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to fetch tags", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchTags(currentPage);
    }, [currentPage, debouncedSearch]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);


    const handleDeleteClick = (tag: TagStats) => {
        setDeleteTag(tag);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTag || !deleteTag.id) return;

        try {
            await tagApi.v1TagsIdDelete(deleteTag.id);
            setIsDeleteOpen(false);
            setDeleteTag(null);
            fetchTags(currentPage);
            toast({ title: "Success", description: "Tag deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete tag", variant: "destructive" });
        }
    };

    const handleTagClick = (tagName: string) => {
        navigate(`/notes?search=tag=${encodeURIComponent(tagName)}`);
    };

    const totalPages = Math.ceil(totalTags / perPage) || 1;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TagIcon className="h-5 w-5" />
                            Tags
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({totalTags} tags)
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
                <CardContent className="h-[600px] flex flex-col p-0">
                    <DataTable
                        data={tags}
                        columns={[
                            {
                                header: "Name",
                                accessorKey: "name",
                                className: "font-medium",
                                sortKey: undefined, // Backend sort not dynamic yet in TagList as per code
                                cell: (tag) => {
                                    const color = tag.name ? stringToColor(tag.name) : "#ccc";
                                    return (
                                        <Badge
                                            variant="secondary"
                                            style={{
                                                backgroundColor: `${color}20`,
                                                color: color,
                                                borderColor: `${color}40`,
                                                cursor: "pointer"
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (tag.name) handleTagClick(tag.name);
                                            }}
                                        >
                                            {tag.name}
                                        </Badge>
                                    );
                                }
                            },
                            {
                                header: "Notes",
                                accessorKey: "noteCount",
                                className: "text-right w-32",
                            },
                            {
                                header: "Actions",
                                className: "text-right w-20",
                                cell: (tag) => (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(tag);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )
                            }
                        ]}
                        keyExtractor={(tag) => String(tag.id)}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalTags}
                        perPage={perPage}
                        onPageChange={setCurrentPage}
                        emptyMessage="No tags found."
                    />
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
