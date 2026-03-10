"use client";

import { IUser } from "@/app/models/User";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GroupChatModalProps {
  isOpen?: boolean;
  onClose: () => void;
  users: IUser[];
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  users = []
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      members: []
    }
  });

  const members = watch('members');

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    axios.post('/api/conversations', {
      ...data,
      isGroup: true
    })
    .then(() => {
      router.refresh();
      onClose();
    })
    .catch(() => toast({ title: "Something went wrong", variant: "destructive" }))
    .finally(() => setIsLoading(false));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Create a group chat</DialogTitle>
            <DialogDescription>Create a chat with more than 2 people.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-12">
                <div className="border-b border-border pb-12">
                    <div className="mt-10 flex flex-col gap-y-8">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-foreground">Name</label>
                            <div className="mt-2">
                                <Input disabled={isLoading} {...register('name', { required: true })} placeholder="Group Name" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium leading-6 text-foreground">Members</label>
                             <div className="mt-2 flex flex-col gap-2 max-h-60 overflow-y-auto">
                                {users.map((user) => (
                                    <div key={(user._id as any).toString()} className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            value={(user._id as any).toString()}
                                            {...register('members', { required: true, validate: (value) => value.length >= 2 || "Select at least 2 members" })}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">{user.name}</span>
                                    </div>
                                ))}
                             </div>
                             {errors.members && <span className="text-destructive text-sm">Select at least 2 members</span>}
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button disabled={isLoading} type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button disabled={isLoading} type="submit">Create</Button>
            </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}

export default GroupChatModal;
