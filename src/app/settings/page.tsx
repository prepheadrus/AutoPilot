import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Bell, User, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-headline font-bold">Settings</h1>
            
            <Tabs defaultValue="exchanges" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                    <TabsTrigger value="exchanges">
                        <KeyRound className="mr-2 h-4 w-4"/> Exchange Keys
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="mr-2 h-4 w-4"/> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="account">
                        <User className="mr-2 h-4 w-4"/> Account
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="exchanges">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Exchange API Keys</CardTitle>
                            <CardDescription>
                                Connect your exchange accounts. Your keys are stored encrypted at rest.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold">Binance</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="binance-api-key">API Key</Label>
                                    <Input id="binance-api-key" placeholder="Your Binance API Key" defaultValue="********************" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="binance-secret-key">Secret Key</Label>
                                    <Input id="binance-secret-key" type="password" placeholder="Your Binance Secret Key" defaultValue="********************" />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="ghost" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                                    <Button size="sm">Test Connection</Button>
                                </div>
                            </div>
                             <div className="space-y-4 p-4 border rounded-lg border-dashed flex flex-col items-center justify-center">
                                <h3 className="font-semibold text-center mb-2">Add New Exchange</h3>
                                <Select>
                                    <SelectTrigger className="w-[280px]">
                                        <SelectValue placeholder="Select Exchange" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kraken">Kraken</SelectItem>
                                        <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                                        <SelectItem value="kucoin">KuCoin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button className="mt-4">Add Exchange</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Notification Settings</CardTitle>
                            <CardDescription>Choose how you want to be notified about trades and bot status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="email-notifs" className="font-medium">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive trade summaries and alerts via email.</p>
                                </div>
                                <Switch id="email-notifs" defaultChecked />
                            </div>
                             <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="push-notifs" className="font-medium">Push Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Get real-time alerts on your mobile device (coming soon).</p>
                                </div>
                                <Switch id="push-notifs" disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="account">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Account Information</CardTitle>
                            <CardDescription>Manage your account details and subscription.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" defaultValue="user@autopilot.dev" disabled />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="plan">Subscription Plan</Label>
                                <Input id="plan" defaultValue="Pro Plan" disabled />
                                <p className="text-sm text-muted-foreground">Your plan renews on August 29, 2024.</p>
                            </div>
                            <Button>Manage Subscription</Button>
                        </CardContent>
                        <Separator className="my-6" />
                         <CardHeader>
                            <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                                <div>
                                    <p className="font-medium">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                                </div>
                                <Button variant="destructive">Delete My Account</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
