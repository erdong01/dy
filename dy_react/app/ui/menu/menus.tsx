'use client'

import * as React from "react"
import Link from "next/link"
import {
    NavigationMenu,
    // NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    // NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "../../../components/ui/navigation-menu"
import { useEffect } from 'react';

export default function Menus() {
    useEffect(() => { /* placeholder for future menu data load */ }, []);

    return (<>
        <NavigationMenu>
            <NavigationMenuList>
                <NavigationMenuItem>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <Link href="/">Home</Link>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                {/* <NavigationMenuItem>
                    <NavigationMenuTrigger>List</NavigationMenuTrigger>
                    <NavigationMenuContent>
                        <ul className="grid w-[300px] gap-4">
                            <li>
                                <NavigationMenuLink asChild>
                                    <Link href="#">
                                        <div className="font-medium">Components</div>
                                        <div className="text-muted-foreground">
                                            Browse all components in the library.
                                        </div>
                                    </Link>
                                </NavigationMenuLink>
                                <NavigationMenuLink asChild>
                                    <Link href="#">
                                        <div className="font-medium">Documentation</div>
                                        <div className="text-muted-foreground">
                                            Learn how to use the library.
                                        </div>
                                    </Link>
                                </NavigationMenuLink>
                                <NavigationMenuLink asChild>
                                    <Link href="#">
                                        <div className="font-medium">Blog</div>
                                        <div className="text-muted-foreground">
                                            Read our latest blog posts.
                                        </div>
                                    </Link>
                                </NavigationMenuLink>
                            </li>
                        </ul>
                    </NavigationMenuContent>
                </NavigationMenuItem> */}
            </NavigationMenuList>
        </NavigationMenu>
    </>);
}

